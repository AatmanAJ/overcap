use std::{
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc::{self, Sender},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};

use serde::Serialize;
use tauri::{
    webview::Color, AppHandle, Emitter, LogicalSize, Manager, Theme, WebviewWindow, Window,
    WindowEvent,
};
use tauri_plugin_positioner::{Position, WindowExt};

use crate::{
    desktop_integration::DesktopIntegration,
    models::{ThemePreference, WindowMode},
    popup::PopupDismissGuard,
    settings::SettingsService,
    storage::{DesktopWindowBounds, Storage},
};

pub const MAIN_WINDOW: &str = "main";
pub const PANEL_WIDTH: f64 = 320.0;
pub const PANEL_MIN_HEIGHT: u32 = 240;
const PANEL_SCREEN_FRACTION: f64 = 0.85;
const PANEL_RESIZE_SAVE_DELAY: Duration = Duration::from_millis(120);
const DESKTOP_POSITION_SAVE_DELAY: Duration = Duration::from_millis(150);
const LIGHT_PANEL_SURFACE: Color = Color(0xfd, 0xf9, 0xf0, 0xff);
const DARK_PANEL_SURFACE: Color = Color(0x14, 0x14, 0x14, 0xff);

#[derive(Clone, Copy)]
struct PendingPanelHeight {
    generation: u64,
    height: u32,
}

#[derive(Clone, Copy)]
struct PendingDesktopWindowBounds {
    generation: u64,
    bounds: DesktopWindowBounds,
}

pub struct DesktopWindowPositionSession {
    generation: Arc<AtomicU64>,
    latest: Mutex<Option<DesktopWindowBounds>>,
    bounds_sender: Sender<PendingDesktopWindowBounds>,
    persistence: Arc<Mutex<()>>,
    storage: Arc<Storage>,
}

impl DesktopWindowPositionSession {
    pub fn new(storage: Arc<Storage>) -> Self {
        let generation = Arc::new(AtomicU64::new(0));
        let persistence = Arc::new(Mutex::new(()));
        let (bounds_sender, bounds_receiver) = mpsc::channel::<PendingDesktopWindowBounds>();
        let worker_generation = generation.clone();
        let worker_persistence = persistence.clone();
        let worker_storage = storage.clone();
        thread::spawn(move || {
            while let Ok(mut pending) = bounds_receiver.recv() {
                while let Ok(next) = bounds_receiver.recv_timeout(DESKTOP_POSITION_SAVE_DELAY) {
                    pending = next;
                }
                let Ok(_guard) = worker_persistence.lock() else {
                    continue;
                };
                if pending.generation == worker_generation.load(Ordering::SeqCst) {
                    let _ = worker_storage.save_desktop_window_bounds(pending.bounds);
                }
            }
        });
        Self {
            generation,
            latest: Mutex::new(None),
            bounds_sender,
            persistence,
            storage,
        }
    }

    fn record(&self, bounds: DesktopWindowBounds) {
        if let Ok(mut latest) = self.latest.lock() {
            *latest = Some(bounds);
        }
        let _ = self.bounds_sender.send(PendingDesktopWindowBounds {
            generation: self.generation.load(Ordering::SeqCst),
            bounds,
        });
    }

    fn flush(&self, current: Option<DesktopWindowBounds>) {
        let bounds = current.or_else(|| self.latest.lock().ok().and_then(|latest| *latest));
        let Some(bounds) = bounds else {
            return;
        };
        let Ok(_guard) = self.persistence.lock() else {
            return;
        };
        self.generation.fetch_add(1, Ordering::SeqCst);
        let _ = self.storage.save_desktop_window_bounds(bounds);
    }

    fn saved(&self) -> Option<DesktopWindowBounds> {
        self.storage.load_desktop_window_bounds().ok().flatten()
    }
}

pub struct PanelResizeSession {
    active: AtomicBool,
    automatic: Arc<AtomicBool>,
    generation: Arc<AtomicU64>,
    latest_height: Mutex<Option<u32>>,
    height_sender: Sender<PendingPanelHeight>,
    persistence: Arc<Mutex<()>>,
    storage: Arc<Storage>,
}

impl PanelResizeSession {
    pub fn new(storage: Arc<Storage>) -> Self {
        let automatic = Arc::new(AtomicBool::new(
            storage.load_panel_height().ok().flatten().is_none(),
        ));
        let generation = Arc::new(AtomicU64::new(0));
        let persistence = Arc::new(Mutex::new(()));
        let (height_sender, height_receiver) = mpsc::channel::<PendingPanelHeight>();
        let worker_automatic = automatic.clone();
        let worker_generation = generation.clone();
        let worker_persistence = persistence.clone();
        let worker_storage = storage.clone();
        thread::spawn(move || {
            while let Ok(mut pending) = height_receiver.recv() {
                while let Ok(next) = height_receiver.recv_timeout(PANEL_RESIZE_SAVE_DELAY) {
                    pending = next;
                }
                let Ok(_guard) = worker_persistence.lock() else {
                    continue;
                };
                if pending.generation == worker_generation.load(Ordering::SeqCst)
                    && !worker_automatic.load(Ordering::SeqCst)
                {
                    let _ = worker_storage.save_panel_height(pending.height);
                }
            }
        });
        Self {
            active: AtomicBool::new(false),
            automatic,
            generation,
            latest_height: Mutex::new(None),
            height_sender,
            persistence,
            storage,
        }
    }

    fn begin(&self, height: u32) -> Result<(), String> {
        self.active.store(true, Ordering::SeqCst);
        if let Ok(mut latest) = self.latest_height.lock() {
            *latest = None;
        }
        if let Err(error) = self.set_manual(height) {
            self.active.store(false, Ordering::SeqCst);
            return Err(error);
        }
        Ok(())
    }

    pub fn finish(&self, current_height: Option<u32>) {
        let was_active = self.active.swap(false, Ordering::SeqCst);
        let recorded_height = self
            .latest_height
            .lock()
            .ok()
            .and_then(|mut height| height.take());
        let Some(height) = current_height.or(recorded_height) else {
            return;
        };
        if !was_active {
            return;
        }
        let Ok(_guard) = self.persistence.lock() else {
            return;
        };
        if !self.automatic.load(Ordering::SeqCst) && self.storage.save_panel_height(height).is_ok()
        {
            self.generation.fetch_add(1, Ordering::SeqCst);
        }
    }

    pub fn set_manual(&self, height: u32) -> Result<(), String> {
        let _guard = self
            .persistence
            .lock()
            .map_err(|_| "Overcap panel state is unavailable.")?;
        self.storage
            .save_panel_height(height)
            .map_err(|_| "Overcap panel state could not be saved.".to_owned())?;
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.automatic.store(false, Ordering::SeqCst);
        Ok(())
    }

    fn record(&self, height: u32) {
        if !self.active.load(Ordering::SeqCst) {
            return;
        }
        if let Ok(mut latest) = self.latest_height.lock() {
            *latest = Some(height);
        }
        let _ = self.height_sender.send(PendingPanelHeight {
            generation: self.generation.load(Ordering::SeqCst),
            height,
        });
    }

    pub fn mode(&self) -> PanelHeightMode {
        if self.automatic.load(Ordering::SeqCst) {
            PanelHeightMode::Automatic
        } else {
            PanelHeightMode::Manual
        }
    }

    fn allows_automatic_fit(&self) -> bool {
        self.automatic.load(Ordering::SeqCst) && !self.active.load(Ordering::SeqCst)
    }

    pub fn set_automatic(&self) -> Result<(), String> {
        self.active.store(false, Ordering::SeqCst);
        if let Ok(mut latest) = self.latest_height.lock() {
            *latest = None;
        }
        let _guard = self
            .persistence
            .lock()
            .map_err(|_| "Overcap panel state is unavailable.")?;
        self.storage
            .clear_panel_height()
            .map_err(|_| "Overcap panel state could not be saved.".to_owned())?;
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.automatic.store(true, Ordering::SeqCst);
        Ok(())
    }

    fn saved_height(&self) -> Option<u32> {
        self.storage.load_panel_height().ok().flatten()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PanelHeightMode {
    Automatic,
    Manual,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PanelResizeEdge {
    Top,
    Bottom,
}

fn panel_surface_color(preference: ThemePreference, system_theme: Theme) -> Color {
    match preference {
        ThemePreference::Dark => DARK_PANEL_SURFACE,
        ThemePreference::Light => LIGHT_PANEL_SURFACE,
        ThemePreference::System if system_theme == Theme::Dark => DARK_PANEL_SURFACE,
        ThemePreference::System => LIGHT_PANEL_SURFACE,
    }
}

fn apply_panel_surface_for_theme(
    window: &WebviewWindow,
    preference: ThemePreference,
    system_theme: Theme,
) -> tauri::Result<()> {
    window.set_background_color(Some(panel_surface_color(preference, system_theme)))
}

pub fn apply_panel_surface(
    window: &WebviewWindow,
    preference: ThemePreference,
) -> tauri::Result<()> {
    let native_theme = match preference {
        ThemePreference::Dark => Some(Theme::Dark),
        ThemePreference::Light => Some(Theme::Light),
        ThemePreference::System => None,
    };
    window.set_theme(native_theme)?;
    apply_panel_surface_for_theme(window, preference, window.theme().unwrap_or(Theme::Light))
}

/// Brings the already-running application forward when a later launch is redirected to it by the
/// single-instance plugin. During an extremely tight simultaneous-launch race the callback can arrive
/// before setup has installed the popup state; the fallback still reveals and focuses the window, while
/// the normal path preserves tray positioning and cancels any pending focus-loss dismissal.
pub fn activate_existing_instance(app: &AppHandle) {
    if let Some(guard) = app.try_state::<PopupDismissGuard>() {
        guard.cancel_pending();
    }

    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    if app.try_state::<DesktopIntegration>().is_some() {
        show_main_window(&window);
        return;
    }

    crate::webview_memory::set_inactive(&window, false);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn position_popup(window: &WebviewWindow) {
    if cfg!(target_os = "linux") {
        let _ = window.center();
    } else {
        let _ = window
            .as_ref()
            .window()
            .move_window_constrained(Position::TrayCenter);
    }
}

pub fn show_main_window(window: &WebviewWindow) {
    finish_native_panel_resize(window);
    crate::webview_memory::set_inactive(window, false);
    if window
        .app_handle()
        .state::<DesktopIntegration>()
        .is_floating()
    {
        let _ = window.unminimize();
        restore_desktop_window_position(window);
        let _ = restore_manual_panel_height(window);
    } else {
        position_popup(window);
        let _ = restore_manual_panel_height(window);
    }
    let _ = window.show();
    let _ = window.set_focus();
}

fn bounds_intersect(left: DesktopWindowBounds, right: DesktopWindowBounds) -> bool {
    let left_right = i64::from(left.x) + i64::from(left.width);
    let left_bottom = i64::from(left.y) + i64::from(left.height);
    let right_right = i64::from(right.x) + i64::from(right.width);
    let right_bottom = i64::from(right.y) + i64::from(right.height);
    i64::from(left.x) < right_right
        && left_right > i64::from(right.x)
        && i64::from(left.y) < right_bottom
        && left_bottom > i64::from(right.y)
}

fn clamp_axis_to_work_area(
    position: i32,
    window_size: u32,
    work_start: i32,
    work_size: u32,
) -> i32 {
    let lower = i64::from(work_start);
    let visible_window_size = i64::from(window_size.min(work_size));
    let upper = (lower + i64::from(work_size) - visible_window_size).max(lower);
    i64::from(position)
        .clamp(lower, upper)
        .clamp(i64::from(i32::MIN), i64::from(i32::MAX)) as i32
}

fn window_bounds(
    window: &Window,
    position: tauri::PhysicalPosition<i32>,
) -> Option<DesktopWindowBounds> {
    let size = window.outer_size().ok()?;
    Some(DesktopWindowBounds {
        x: position.x,
        y: position.y,
        width: size.width.max(1),
        height: size.height.max(1),
    })
}

fn persist_desktop_window_bounds(window: &Window) {
    let app = window.app_handle();
    if !app.state::<DesktopIntegration>().is_floating() {
        return;
    }
    let Some(session) = app.try_state::<Arc<DesktopWindowPositionSession>>() else {
        return;
    };
    let bounds = window
        .outer_position()
        .ok()
        .and_then(|position| window_bounds(window, position));
    session.flush(bounds);
}

fn restore_desktop_window_position(window: &WebviewWindow) {
    let saved = window
        .app_handle()
        .try_state::<Arc<DesktopWindowPositionSession>>()
        .and_then(|session| session.saved());
    let restored_position = saved.and_then(|bounds| {
        window.available_monitors().ok().and_then(|monitors| {
            monitors.into_iter().find_map(|monitor| {
                let work_area = monitor.work_area();
                let work_bounds = DesktopWindowBounds {
                    x: work_area.position.x,
                    y: work_area.position.y,
                    width: work_area.size.width,
                    height: work_area.size.height,
                };
                if !bounds_intersect(bounds, work_bounds) {
                    return None;
                }
                Some(tauri::PhysicalPosition::new(
                    clamp_axis_to_work_area(
                        bounds.x,
                        bounds.width,
                        work_bounds.x,
                        work_bounds.width,
                    ),
                    clamp_axis_to_work_area(
                        bounds.y,
                        bounds.height,
                        work_bounds.y,
                        work_bounds.height,
                    ),
                ))
            })
        })
    });
    if let Some(position) = restored_position {
        let _ = window.set_position(position);
    } else {
        let _ = window.center();
    }
}

#[cfg(target_os = "macos")]
fn set_desktop_shell_visibility(window: &WebviewWindow, floating: bool) -> tauri::Result<()> {
    window.app_handle().set_activation_policy(if floating {
        tauri::ActivationPolicy::Regular
    } else {
        tauri::ActivationPolicy::Accessory
    })
}

#[cfg(not(target_os = "macos"))]
fn set_desktop_shell_visibility(window: &WebviewWindow, floating: bool) -> tauri::Result<()> {
    window.set_skip_taskbar(!floating)
}

fn set_window_chrome(window: &WebviewWindow, floating: bool) -> tauri::Result<()> {
    window
        .set_resizable(false)
        .and_then(|_| set_desktop_shell_visibility(window, floating))
        .and_then(|_| window.set_always_on_top(!floating))
        .and_then(|_| window.set_decorations(false))
}

pub fn apply_window_mode(
    window: &WebviewWindow,
    mode: WindowMode,
    center_floating: bool,
) -> Result<(), String> {
    let integration = window.app_handle().state::<DesktopIntegration>();
    let previous_floating = integration.is_floating();
    let floating = !integration.tray_available() || mode == WindowMode::Floating;

    window
        .app_handle()
        .state::<PopupDismissGuard>()
        .cancel_pending();
    finish_native_panel_resize(window);
    if previous_floating && !floating {
        persist_desktop_window_bounds(&window.as_ref().window());
    }
    if set_window_chrome(window, floating).is_err() {
        let _ = set_window_chrome(window, previous_floating);
        return Err("Overcap window mode could not be changed.".to_owned());
    }

    integration.apply_window_mode(mode);
    window
        .app_handle()
        .state::<PopupDismissGuard>()
        .cancel_pending();
    let result = {
        crate::webview_memory::set_inactive(window, false);
        let _ = window.unminimize();
        if floating {
            if center_floating {
                restore_desktop_window_position(window);
            }
        } else {
            position_popup(window);
        }
        let _ = restore_manual_panel_height(window);
        window
            .show()
            .and_then(|_| window.set_focus())
            .map_err(|_| "Overcap window could not be shown.".to_owned())
    };
    if result.is_err() {
        integration.set_floating(previous_floating);
        let _ = set_window_chrome(window, previous_floating);
    }
    result
}

fn hide_main_native_window(window: &Window) {
    persist_desktop_window_bounds(window);
    if window.hide().is_err() {
        return;
    }
    if let Some(webview) = window.app_handle().get_webview_window(MAIN_WINDOW) {
        crate::webview_memory::set_inactive(&webview, true);
    }
    let _ = window.app_handle().emit("main-window-hidden", ());
}

pub fn hide_main_window(window: &WebviewWindow) {
    finish_native_panel_resize(window);
    hide_main_native_window(&window.as_ref().window());
}

pub fn restart_application(app: &AppHandle) -> ! {
    persist_application_window_state(app);
    app.restart()
}

pub fn quit_application(app: &AppHandle) {
    persist_application_window_state(app);
    app.exit(0);
}

pub fn persist_application_window_state(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        finish_native_panel_resize(&window);
        persist_desktop_window_bounds(&window.as_ref().window());
    }
}

pub fn toggle_main_window(app: &AppHandle) {
    app.state::<PopupDismissGuard>().cancel_pending();

    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };

    let visible = window.is_visible().unwrap_or(false);
    let minimized = window.is_minimized().unwrap_or(false);
    if visible && !minimized {
        hide_main_window(&window);
    } else {
        show_main_window(&window);
    }
}

pub fn open_screen(app: &AppHandle, screen: &str) {
    app.state::<PopupDismissGuard>().cancel_pending();
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        show_main_window(&window);
        let _ = app.emit("open-screen", screen);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct VerticalFrame {
    top: i32,
    height: u32,
}

fn panel_resize_edge_for_frames(
    current: VerticalFrame,
    work_area: VerticalFrame,
) -> PanelResizeEdge {
    let current_bottom = i64::from(current.top) + i64::from(current.height);
    let work_bottom = i64::from(work_area.top) + i64::from(work_area.height);
    let top_gap = (i64::from(current.top) - i64::from(work_area.top)).abs();
    let bottom_gap = (work_bottom - current_bottom).abs();
    if bottom_gap <= top_gap {
        PanelResizeEdge::Top
    } else {
        PanelResizeEdge::Bottom
    }
}

fn panel_resize_edge_for_context(
    current: VerticalFrame,
    work_area: VerticalFrame,
    floating: bool,
) -> PanelResizeEdge {
    if floating {
        PanelResizeEdge::Bottom
    } else {
        panel_resize_edge_for_frames(current, work_area)
    }
}

fn anchored_vertical_frame(
    current: VerticalFrame,
    work_area: VerticalFrame,
    new_height: u32,
) -> VerticalFrame {
    let current_bottom = i64::from(current.top) + i64::from(current.height);
    let top = match panel_resize_edge_for_frames(current, work_area) {
        PanelResizeEdge::Top => current_bottom.saturating_sub(i64::from(new_height)),
        PanelResizeEdge::Bottom => i64::from(current.top),
    };
    VerticalFrame {
        top: top.clamp(i64::from(i32::MIN), i64::from(i32::MAX)) as i32,
        height: new_height,
    }
}

pub fn panel_resize_edge(window: &WebviewWindow) -> Result<PanelResizeEdge, String> {
    let position = window
        .outer_position()
        .map_err(|_| "Overcap window position is unavailable.")?;
    let size = window
        .outer_size()
        .map_err(|_| "Overcap window size is unavailable.")?;
    let monitor = window
        .current_monitor()
        .map_err(|_| "Overcap display is unavailable.")?
        .ok_or("Overcap display is unavailable.")?;
    let work_area = monitor.work_area();
    Ok(panel_resize_edge_for_context(
        VerticalFrame {
            top: position.y,
            height: size.height,
        },
        VerticalFrame {
            top: work_area.position.y,
            height: work_area.size.height,
        },
        window
            .app_handle()
            .state::<DesktopIntegration>()
            .is_floating(),
    ))
}

fn panel_maximum_height(window: &WebviewWindow) -> Result<u32, String> {
    let position = window
        .outer_position()
        .map_err(|_| "Overcap window position is unavailable.")?;
    let outer_size = window
        .outer_size()
        .map_err(|_| "Overcap window size is unavailable.")?;
    let inner_size = window
        .inner_size()
        .map_err(|_| "Overcap content size is unavailable.")?;
    let scale = window
        .scale_factor()
        .map_err(|_| "Overcap display scale is unavailable.")?;
    let monitor = window
        .current_monitor()
        .map_err(|_| "Overcap display is unavailable.")?
        .ok_or("Overcap display is unavailable.")?;
    let work_area = monitor.work_area();
    let current = VerticalFrame {
        top: position.y,
        height: outer_size.height,
    };
    let work = VerticalFrame {
        top: work_area.position.y,
        height: work_area.size.height,
    };
    let current_bottom = i64::from(current.top) + i64::from(current.height);
    let work_bottom = i64::from(work.top) + i64::from(work.height);
    let room = match panel_resize_edge_for_context(
        current,
        work,
        window
            .app_handle()
            .state::<DesktopIntegration>()
            .is_floating(),
    ) {
        PanelResizeEdge::Top => current_bottom.saturating_sub(i64::from(work.top)),
        PanelResizeEdge::Bottom => work_bottom.saturating_sub(i64::from(current.top)),
    }
    .max(1) as f64;
    let aesthetic_cap = f64::from(work.height) * PANEL_SCREEN_FRACTION;
    let frame_overhead = outer_size.height.saturating_sub(inner_size.height);
    let inner_cap =
        room.min(aesthetic_cap).max(f64::from(frame_overhead) + 1.0) - f64::from(frame_overhead);
    Ok((inner_cap / scale).floor().clamp(1.0, f64::from(u32::MAX)) as u32)
}

fn configure_panel_size_constraints(window: &WebviewWindow) -> Result<u32, String> {
    let maximum = panel_maximum_height(window)?;
    let minimum = PANEL_MIN_HEIGHT.min(maximum);
    window
        .set_max_size(Some(LogicalSize::new(PANEL_WIDTH, f64::from(maximum))))
        .and_then(|_| window.set_min_size(Some(LogicalSize::new(PANEL_WIDTH, f64::from(minimum)))))
        .map_err(|_| "Overcap panel size limits could not be applied.".to_owned())?;
    Ok(maximum)
}

fn restore_manual_panel_height(window: &WebviewWindow) -> Result<(), String> {
    let maximum = panel_maximum_height(window)?;
    let minimum = PANEL_MIN_HEIGHT.min(maximum);
    let saved = window
        .app_handle()
        .try_state::<Arc<PanelResizeSession>>()
        .and_then(|session| session.saved_height());
    if let Some(saved) = saved {
        resize_panel_for_context(window, saved.clamp(minimum, maximum))?;
    }
    configure_panel_size_constraints(window)?;
    Ok(())
}

fn resize_panel_for_context(window: &WebviewWindow, height: u32) -> Result<(), String> {
    if window
        .app_handle()
        .state::<DesktopIntegration>()
        .is_floating()
    {
        return window
            .set_size(LogicalSize::new(PANEL_WIDTH, f64::from(height)))
            .map_err(|_| "Overcap window could not be resized.".to_owned());
    }
    resize_popup_anchored(window, height)
}

pub fn fit_panel_to_content(window: &WebviewWindow, height: u32) -> Result<bool, String> {
    let Some(session) = window.app_handle().try_state::<Arc<PanelResizeSession>>() else {
        return Ok(false);
    };
    if !session.allows_automatic_fit() {
        return Ok(false);
    }
    // Show/open and native drag setup already install the constraints. Auto-fit only needs the
    // current monitor clamp here; reapplying native min/max constraints on every animation frame
    // causes unnecessary platform window-manager work.
    let maximum = panel_maximum_height(window)?;
    let minimum = PANEL_MIN_HEIGHT.min(maximum);
    resize_panel_for_context(window, height.clamp(minimum, maximum))?;
    Ok(true)
}

pub fn prepare_native_panel_resize(window: &WebviewWindow) -> Result<PanelResizeEdge, String> {
    let edge = panel_resize_edge(window)?;
    configure_panel_size_constraints(window)?;
    window
        .set_resizable(true)
        .map_err(|_| "Overcap panel resize could not be enabled.".to_owned())?;
    if let Some(session) = window.app_handle().try_state::<Arc<PanelResizeSession>>() {
        let height = current_logical_height(&window.as_ref().window())
            .ok_or("Overcap content size is unavailable.")?;
        session.begin(height)?;
    }
    Ok(edge)
}

pub fn set_manual_panel_height(window: &WebviewWindow) -> Result<(), String> {
    let height = current_logical_height(&window.as_ref().window())
        .ok_or("Overcap content size is unavailable.")?;
    window
        .app_handle()
        .state::<Arc<PanelResizeSession>>()
        .set_manual(height)
}

pub fn finish_native_panel_resize(window: &WebviewWindow) {
    if let Some(session) = window.app_handle().try_state::<Arc<PanelResizeSession>>() {
        session.finish(current_logical_height(&window.as_ref().window()));
    }
    let _ = lock_native_panel_resize_axis(window);
}

pub fn lock_native_panel_resize_axis(window: &WebviewWindow) -> Result<(), String> {
    // Keep the system's invisible left/right resize borders disabled outside the explicit vertical
    // gesture. Re-applying the logical width also repairs any transient WebView viewport change if a
    // platform briefly reported a horizontal resize before the native constraint took effect.
    window
        .set_resizable(false)
        .map_err(|_| "Overcap panel resize could not be settled.".to_owned())?;
    let size = window
        .inner_size()
        .map_err(|_| "Overcap content size is unavailable.")?;
    let scale = window
        .scale_factor()
        .map_err(|_| "Overcap display scale is unavailable.")?;
    let height = f64::from(size.height) / scale;
    window
        .set_size(LogicalSize::new(PANEL_WIDTH, height))
        .map_err(|_| "Overcap panel resize could not be settled.".to_owned())
}

fn current_logical_height(window: &Window) -> Option<u32> {
    let size = window.inner_size().ok()?;
    let scale = window.scale_factor().ok()?;
    Some(
        (f64::from(size.height) / scale)
            .round()
            .clamp(1.0, f64::from(u32::MAX)) as u32,
    )
}

#[cfg(target_os = "windows")]
pub fn resize_popup_anchored(window: &WebviewWindow, height: u32) -> Result<(), String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, SWP_NOACTIVATE, SWP_NOOWNERZORDER, SWP_NOZORDER,
    };

    let outer_position = window
        .outer_position()
        .map_err(|_| "Overcap window position is unavailable.")?;
    let outer_size = window
        .outer_size()
        .map_err(|_| "Overcap window size is unavailable.")?;
    let inner_size = window
        .inner_size()
        .map_err(|_| "Overcap content size is unavailable.")?;
    let scale = window
        .scale_factor()
        .map_err(|_| "Overcap display scale is unavailable.")?;
    let monitor = window
        .current_monitor()
        .map_err(|_| "Overcap display is unavailable.")?
        .ok_or("Overcap display is unavailable.")?;
    let work_area = monitor.work_area();
    let frame_overhead = outer_size.height.saturating_sub(inner_size.height);
    let target_inner_height = (f64::from(height) * scale)
        .round()
        .clamp(1.0, f64::from(u32::MAX));
    let target_outer_height = (target_inner_height as u32).saturating_add(frame_overhead);
    let anchored = anchored_vertical_frame(
        VerticalFrame {
            top: outer_position.y,
            height: outer_size.height,
        },
        VerticalFrame {
            top: work_area.position.y,
            height: work_area.size.height,
        },
        target_outer_height,
    );
    let result = unsafe {
        SetWindowPos(
            window
                .hwnd()
                .map_err(|_| "Overcap native window is unavailable.")?
                .0 as _,
            std::ptr::null_mut(),
            outer_position.x,
            anchored.top,
            i32::try_from(outer_size.width).unwrap_or(i32::MAX),
            i32::try_from(anchored.height).unwrap_or(i32::MAX),
            SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER,
        )
    };
    if result == 0 {
        return Err("Overcap window could not be resized.".into());
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn resize_popup_anchored(window: &WebviewWindow, height: u32) -> Result<(), String> {
    let outer_position = window
        .outer_position()
        .map_err(|_| "Overcap window position is unavailable.")?;
    let outer_size = window
        .outer_size()
        .map_err(|_| "Overcap window size is unavailable.")?;
    let monitor = window
        .current_monitor()
        .map_err(|_| "Overcap display is unavailable.")?
        .ok_or("Overcap display is unavailable.")?;
    let work_area = monitor.work_area();
    let scale = window
        .scale_factor()
        .map_err(|_| "Overcap display scale is unavailable.")?;
    let target_outer_height = (f64::from(height) * scale)
        .round()
        .clamp(1.0, f64::from(u32::MAX)) as u32;
    let anchored = anchored_vertical_frame(
        VerticalFrame {
            top: outer_position.y,
            height: outer_size.height,
        },
        VerticalFrame {
            top: work_area.position.y,
            height: work_area.size.height,
        },
        target_outer_height,
    );
    window
        .set_size(tauri::LogicalSize::new(320.0, f64::from(height)))
        .and_then(|_| {
            window.set_position(tauri::PhysicalPosition::new(outer_position.x, anchored.top))
        })
        .map_err(|_| "Overcap window could not be resized.".into())
}

fn schedule_outside_click_dismiss(window: Window) {
    let app = window.app_handle().clone();
    let token = app.state::<PopupDismissGuard>().token();

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(100));
        let app_for_dismiss = app.clone();
        let _ = app.run_on_main_thread(move || {
            let guard = app_for_dismiss.state::<PopupDismissGuard>();
            let still_unfocused = window.is_focused().is_ok_and(|focused| !focused);

            if guard.is_current(token) && still_unfocused {
                if let Some(session) = window.app_handle().try_state::<Arc<PanelResizeSession>>() {
                    session.finish(current_logical_height(&window));
                }
                let _ = window.set_resizable(false);
                hide_main_native_window(&window);
            }
        });
    });
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != MAIN_WINDOW {
        return;
    }

    match event {
        WindowEvent::Moved(position)
            if window
                .app_handle()
                .try_state::<DesktopIntegration>()
                .is_some_and(|integration| integration.is_floating()) =>
        {
            if let (Some(session), Some(bounds)) = (
                window
                    .app_handle()
                    .try_state::<Arc<DesktopWindowPositionSession>>(),
                window_bounds(window, *position),
            ) {
                session.record(bounds);
            }
        }
        WindowEvent::Resized(size) => {
            if let Some(session) = window.app_handle().try_state::<Arc<PanelResizeSession>>() {
                let scale = window.scale_factor().unwrap_or(1.0);
                let height = (f64::from(size.height) / scale)
                    .round()
                    .clamp(1.0, f64::from(u32::MAX)) as u32;
                session.record(height);
            }
        }
        WindowEvent::ThemeChanged(theme) => {
            let app = window.app_handle();
            let preference = app
                .try_state::<Arc<SettingsService>>()
                .map(|settings| settings.get().theme);
            if preference == Some(ThemePreference::System) {
                if let Some(webview) = app.get_webview_window(MAIN_WINDOW) {
                    let _ =
                        apply_panel_surface_for_theme(&webview, ThemePreference::System, *theme);
                }
            }
        }
        WindowEvent::Focused(false)
            if !window
                .app_handle()
                .state::<DesktopIntegration>()
                .is_floating() =>
        {
            schedule_outside_click_dismiss(window.clone())
        }
        WindowEvent::CloseRequested { api, .. } => {
            if let Some(session) = window.app_handle().try_state::<Arc<PanelResizeSession>>() {
                session.finish(current_logical_height(window));
            }
            let _ = window.set_resizable(false);
            api.prevent_close();
            let integration = window.app_handle().state::<DesktopIntegration>();
            if integration.exits_on_close() {
                window.app_handle().exit(0);
                return;
            }
            window
                .app_handle()
                .state::<PopupDismissGuard>()
                .cancel_pending();
            hide_main_native_window(window);
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use tempfile::tempdir;

    use super::{
        anchored_vertical_frame, bounds_intersect, clamp_axis_to_work_area,
        panel_resize_edge_for_context, panel_resize_edge_for_frames, panel_surface_color,
        DesktopWindowPositionSession, PanelHeightMode, PanelResizeEdge, PanelResizeSession,
        VerticalFrame, DARK_PANEL_SURFACE, LIGHT_PANEL_SURFACE,
    };
    use crate::models::ThemePreference;
    use crate::storage::{DesktopWindowBounds, Storage};
    use tauri::Theme;

    #[test]
    fn a_real_resize_owns_the_height_until_automatic_mode_is_restored() {
        let directory = tempdir().unwrap();
        let storage = Arc::new(Storage::open(&directory.path().join("overcap.db")).unwrap());
        let session = PanelResizeSession::new(storage.clone());

        assert_eq!(session.mode(), PanelHeightMode::Automatic);
        session.begin(540).unwrap();
        assert_eq!(session.mode(), PanelHeightMode::Manual);
        assert_eq!(storage.load_panel_height().unwrap(), Some(540));
        session.record(612);
        session.finish(Some(612));
        assert_eq!(session.mode(), PanelHeightMode::Manual);
        assert_eq!(storage.load_panel_height().unwrap(), Some(612));

        let restarted = PanelResizeSession::new(storage.clone());
        assert_eq!(restarted.mode(), PanelHeightMode::Manual);
        assert_eq!(restarted.saved_height(), Some(612));

        session.set_automatic().unwrap();
        assert_eq!(session.mode(), PanelHeightMode::Automatic);
        assert_eq!(storage.load_panel_height().unwrap(), None);

        session.begin(680).unwrap();
        session.record(720);
        session.set_automatic().unwrap();
        session.finish(Some(720));
        assert_eq!(session.mode(), PanelHeightMode::Automatic);
        assert_eq!(storage.load_panel_height().unwrap(), None);
    }

    #[test]
    fn desktop_window_position_flushes_the_latest_move_before_restart() {
        let directory = tempdir().unwrap();
        let storage = Arc::new(Storage::open(&directory.path().join("overcap.db")).unwrap());
        let session = DesktopWindowPositionSession::new(storage.clone());
        let first = DesktopWindowBounds {
            x: 120,
            y: 80,
            width: 320,
            height: 640,
        };
        let latest = DesktopWindowBounds {
            x: -1_720,
            y: 160,
            width: 320,
            height: 640,
        };

        session.record(first);
        session.record(latest);
        session.flush(None);

        assert_eq!(storage.load_desktop_window_bounds().unwrap(), Some(latest));
    }

    #[test]
    fn saved_desktop_window_only_restores_when_it_intersects_a_live_display() {
        let second_display = DesktopWindowBounds {
            x: -1_920,
            y: 0,
            width: 1_920,
            height: 1_080,
        };
        assert!(bounds_intersect(
            DesktopWindowBounds {
                x: -1_700,
                y: 100,
                width: 320,
                height: 640,
            },
            second_display,
        ));
        assert!(!bounds_intersect(
            DesktopWindowBounds {
                x: 2_560,
                y: 100,
                width: 320,
                height: 640,
            },
            second_display,
        ));
    }

    #[test]
    fn restored_desktop_window_is_clamped_inside_the_live_display() {
        assert_eq!(clamp_axis_to_work_area(1_919, 320, 0, 1_920), 1_600);
        assert_eq!(clamp_axis_to_work_area(-1_700, 320, -1_920, 1_920), -1_700);
        assert_eq!(clamp_axis_to_work_area(-2_100, 320, -1_920, 1_920), -1_920);
    }

    #[test]
    fn panel_surface_follows_explicit_and_system_theme_preferences() {
        assert_eq!(
            panel_surface_color(ThemePreference::Dark, Theme::Light),
            DARK_PANEL_SURFACE
        );
        assert_eq!(
            panel_surface_color(ThemePreference::Light, Theme::Dark),
            LIGHT_PANEL_SURFACE
        );
        assert_eq!(
            panel_surface_color(ThemePreference::System, Theme::Dark),
            DARK_PANEL_SURFACE
        );
        assert_eq!(
            panel_surface_color(ThemePreference::System, Theme::Light),
            LIGHT_PANEL_SURFACE
        );
    }

    #[test]
    fn bottom_anchored_popup_exposes_a_top_resize_grip() {
        assert_eq!(
            panel_resize_edge_for_frames(
                VerticalFrame {
                    top: 496,
                    height: 300,
                },
                VerticalFrame {
                    top: 100,
                    height: 700,
                },
            ),
            PanelResizeEdge::Top
        );
    }

    #[test]
    fn top_anchored_popup_exposes_a_bottom_resize_grip() {
        assert_eq!(
            panel_resize_edge_for_frames(
                VerticalFrame {
                    top: 104,
                    height: 300,
                },
                VerticalFrame {
                    top: 100,
                    height: 700,
                },
            ),
            PanelResizeEdge::Bottom
        );
    }

    #[test]
    fn floating_window_always_uses_the_bottom_resize_grip() {
        let work = VerticalFrame {
            top: 0,
            height: 1_080,
        };
        for top in [0, 140, 700] {
            assert_eq!(
                panel_resize_edge_for_context(VerticalFrame { top, height: 320 }, work, true),
                PanelResizeEdge::Bottom
            );
        }
    }

    #[test]
    fn shrinking_bottom_anchored_popup_preserves_its_bottom_edge() {
        let resized = anchored_vertical_frame(
            VerticalFrame {
                top: 496,
                height: 300,
            },
            VerticalFrame {
                top: 100,
                height: 700,
            },
            200,
        );
        assert_eq!(
            resized,
            VerticalFrame {
                top: 596,
                height: 200
            }
        );
    }

    #[test]
    fn shrinking_top_anchored_popup_preserves_its_top_edge() {
        let resized = anchored_vertical_frame(
            VerticalFrame {
                top: 104,
                height: 300,
            },
            VerticalFrame {
                top: 100,
                height: 700,
            },
            200,
        );
        assert_eq!(
            resized,
            VerticalFrame {
                top: 104,
                height: 200
            }
        );
    }
}
