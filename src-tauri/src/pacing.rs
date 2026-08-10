use std::{collections::HashSet, sync::Arc};

use chrono::{DateTime, Utc};

#[cfg(test)]
use chrono::Duration;

use crate::models::{
    AppSettings, MetricSource, NotificationPreferences, NotificationThresholds, ProviderSnapshot,
    TimeFormatPreference,
};
#[cfg(test)]
use crate::models::{QuotaFormat, QuotaWindow};
use crate::providers::ProviderRegistry;
use crate::storage::{Storage, ThresholdNotificationClaim};

#[cfg(test)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum PaceSeverity {
    Untracked,
    Healthy,
    Close,
    RunningOut,
    Spent,
}

#[cfg(test)]
#[derive(Debug, Clone, PartialEq)]
pub struct PaceProjection {
    pub severity: PaceSeverity,
    pub projected_used_percent: Option<f64>,
    pub even_pace_percent: Option<f64>,
    pub run_out_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
pub fn project(
    window: &QuotaWindow,
    now: DateTime<Utc>,
    is_session_window: bool,
) -> PaceProjection {
    let used = window.used_percent.clamp(0.0, 100.0);
    if is_visibly_spent(window, used) {
        return PaceProjection {
            severity: PaceSeverity::Spent,
            projected_used_percent: Some(100.0),
            even_pace_percent: None,
            run_out_at: Some(now),
        };
    }
    let Some(resets_at) = window.resets_at else {
        return level_projection(used);
    };
    if window.period_seconds == 0 || resets_at <= now {
        return level_projection(used);
    }
    if is_session_window && used <= 0.0 {
        return level_projection(used);
    }
    let period = Duration::seconds(window.period_seconds as i64);
    let starts_at = resets_at - period;
    let elapsed_seconds = now
        .signed_duration_since(starts_at)
        .num_milliseconds()
        .max(0) as f64
        / 1000.0;
    let progress = (elapsed_seconds / window.period_seconds as f64).clamp(0.0, 1.0);
    // Very young windows carry too little signal for a useful burn-rate projection.
    if elapsed_seconds < (window.period_seconds as f64 * 0.01).max(60.0) {
        return level_projection(used);
    }
    let projected = used / progress;
    if projected <= 90.0 {
        return PaceProjection {
            severity: PaceSeverity::Healthy,
            projected_used_percent: Some(projected),
            even_pace_percent: Some(progress * 100.0),
            run_out_at: None,
        };
    }
    if used < 5.0 {
        return level_projection(used);
    }
    if projected <= 100.0 {
        return PaceProjection {
            severity: if (100.0 - projected).round() >= 1.0 {
                PaceSeverity::Close
            } else {
                PaceSeverity::RunningOut
            },
            projected_used_percent: Some(projected),
            even_pace_percent: Some(progress * 100.0),
            run_out_at: None,
        };
    }
    let candidate =
        starts_at + Duration::milliseconds((elapsed_seconds * 1000.0 * 100.0 / used) as i64);
    let run_out_at = (candidate > now && candidate < resets_at).then_some(candidate);
    PaceProjection {
        severity: PaceSeverity::RunningOut,
        projected_used_percent: Some(projected),
        even_pace_percent: Some(progress * 100.0),
        run_out_at,
    }
}

#[cfg(test)]
fn is_visibly_spent(window: &QuotaWindow, used_percent: f64) -> bool {
    if window.format == QuotaFormat::Dollars {
        if let (Some(used), Some(limit)) = (window.used_value, window.limit_value) {
            if limit > 0.0 {
                return ((limit - used) * 100.0).round() / 100.0 <= 0.0;
            }
        }
    }
    (100.0 - used_percent).round() <= 0.0
}

#[cfg(test)]
fn level_projection(_used: f64) -> PaceProjection {
    PaceProjection {
        severity: PaceSeverity::Untracked,
        projected_used_percent: None,
        even_pace_percent: None,
        run_out_at: None,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThresholdLevel {
    Warning,
    Critical,
    Capped,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ThresholdCrossing {
    pub level: ThresholdLevel,
    pub threshold: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ThresholdAlert {
    pub provider: String,
    pub metric: String,
    pub level: ThresholdLevel,
    pub threshold: u8,
    pub message: String,
    claim: ThresholdNotificationClaim,
}

pub struct NotificationEvaluator {
    storage: Arc<Storage>,
}

impl NotificationEvaluator {
    pub fn new(storage: Arc<Storage>) -> Self {
        Self { storage }
    }

    pub fn rollback(&self, alerts: &[ThresholdAlert]) {
        for alert in alerts {
            if self
                .storage
                .rollback_notification_threshold(&alert.claim)
                .is_err()
            {
                crate::app_error!(
                    "notifications",
                    "failed notification claim could not be rolled back"
                );
            }
        }
    }

    pub fn evaluate(
        &self,
        snapshot: &ProviderSnapshot,
        settings: &AppSettings,
        registry: &ProviderRegistry,
        now: DateTime<Utc>,
    ) -> Vec<ThresholdAlert> {
        let Some(provider) = settings
            .providers
            .iter()
            .find(|provider| provider.id == snapshot.provider_id && provider.enabled)
        else {
            return Vec::new();
        };
        let Some(provider_definition) = registry.definition(&snapshot.provider_id) else {
            return Vec::new();
        };
        let enabled = provider
            .metrics
            .iter()
            .filter(|metric| metric.enabled)
            .map(|metric| metric.id.as_str())
            .collect::<HashSet<_>>();
        let thresholds = settings
            .provider_notification_thresholds
            .get(&snapshot.provider_id)
            .copied()
            .unwrap_or(settings.notification_thresholds)
            .normalized();
        let provider_name = settings
            .provider_display_name(provider_definition)
            .to_owned();
        let mut alerts = Vec::new();
        for window in &snapshot.quotas {
            let Some(resets_at) = window.resets_at.filter(|reset| *reset > now) else {
                continue;
            };
            let Some(metric_definition) = provider_definition.metrics.iter().find(|metric| {
                matches!(
                    &metric.source,
                    MetricSource::Quota { source_id, .. }
                        | MetricSource::QuotaOrValue { source_id, .. }
                        if source_id == &window.id
                )
            }) else {
                continue;
            };
            if !enabled.contains(metric_definition.id.as_str()) {
                continue;
            }
            let Some(crossing) =
                highest_crossed_threshold(window.used_percent, thresholds, &settings.notifications)
            else {
                continue;
            };
            let claim = match self.storage.claim_notification_threshold(
                &metric_definition.id,
                resets_at.timestamp_millis(),
                crossing.threshold,
            ) {
                Ok(Some(claim)) => claim,
                Ok(None) => continue,
                Err(_) => {
                    crate::app_error!("notifications", "notification state could not be persisted");
                    continue;
                }
            };
            alerts.push(ThresholdAlert {
                provider: provider_name.clone(),
                metric: metric_definition.label.clone(),
                level: crossing.level,
                threshold: crossing.threshold,
                message: alert_message(&provider_name, crossing, resets_at, settings.time_format),
                claim,
            });
        }
        alerts
    }
}

pub fn highest_crossed_threshold(
    used_percent: f64,
    thresholds: NotificationThresholds,
    toggles: &NotificationPreferences,
) -> Option<ThresholdCrossing> {
    if !used_percent.is_finite() {
        return None;
    }
    let thresholds = thresholds.normalized();
    [
        (
            ThresholdLevel::Capped,
            thresholds.capped,
            toggles.will_run_out,
        ),
        (
            ThresholdLevel::Critical,
            thresholds.critical,
            toggles.cutting_it_close,
        ),
        (
            ThresholdLevel::Warning,
            thresholds.warning,
            toggles.almost_out,
        ),
    ]
    .into_iter()
    .find(|(_, threshold, enabled)| *enabled && used_percent >= f64::from(*threshold))
    .map(|(level, threshold, _)| ThresholdCrossing { level, threshold })
}

fn alert_message(
    provider: &str,
    crossing: ThresholdCrossing,
    resets_at: DateTime<Utc>,
    time_format: TimeFormatPreference,
) -> String {
    match crossing.level {
        ThresholdLevel::Warning => {
            format!("{provider} at {}%. Pace yourself.", crossing.threshold)
        }
        ThresholdLevel::Critical => format!("{}%. Redlining.", crossing.threshold),
        ThresholdLevel::Capped => {
            format!("Capped. Back at {}.", reset_time(resets_at, time_format))
        }
    }
}

fn reset_time(resets_at: DateTime<Utc>, time_format: TimeFormatPreference) -> String {
    let local = resets_at.with_timezone(&chrono::Local);
    if time_format == TimeFormatPreference::TwelveHour {
        local
            .format("%I:%M %p")
            .to_string()
            .trim_start_matches('0')
            .to_owned()
    } else {
        local.format("%H:%M").to_string()
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use chrono::{Duration, TimeZone, Utc};
    use tempfile::tempdir;

    use super::{
        highest_crossed_threshold, project, NotificationEvaluator, PaceSeverity, ThresholdLevel,
    };
    use crate::models::{
        AppSettings, MetricDefinition, MetricLayout, MetricSection, MetricSource,
        NotificationPreferences, NotificationThresholds, ProviderDefinition, ProviderLayout,
        ProviderSnapshot, QuotaWindow, UsageHistory,
    };
    use crate::providers::ProviderRegistry;
    use crate::storage::Storage;

    fn window(used: f64, elapsed_fraction: f64) -> QuotaWindow {
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        let period = 10_000_u64;
        QuotaWindow {
            id: "session".into(),
            label: "Session".into(),
            used_percent: used,
            resets_at: Some(
                now + Duration::seconds(((1.0 - elapsed_fraction) * period as f64) as i64),
            ),
            period_seconds: period,
            format: crate::models::QuotaFormat::Percent,
            used_value: None,
            limit_value: None,
            unit: None,
            estimated: false,
            source_note: None,
        }
    }

    #[test]
    fn projection_colors_by_expected_usage_at_reset() {
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        assert_eq!(
            project(&window(30.0, 0.5), now, false).severity,
            PaceSeverity::Healthy
        );
        assert_eq!(
            project(&window(46.0, 0.5), now, false).severity,
            PaceSeverity::Close
        );
        assert_eq!(
            project(&window(60.0, 0.5), now, false).severity,
            PaceSeverity::RunningOut
        );
    }

    #[test]
    fn projection_uses_reference_signal_and_low_usage_guards() {
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        let ready = project(&window(1.0, 0.015), now, false);
        assert_eq!(ready.severity, PaceSeverity::Healthy);
        assert!((ready.projected_used_percent.unwrap() - 66.666).abs() < 0.01);
        assert_eq!(
            project(&window(1.0, 0.009), now, false).severity,
            PaceSeverity::Untracked
        );
        assert_eq!(
            project(&window(4.0, 0.02), now, false).severity,
            PaceSeverity::Untracked
        );
    }

    #[test]
    fn projection_preserves_subsecond_elapsed_precision() {
        let now = Utc.timestamp_millis_opt(1_800_000_000_500).unwrap();
        let mut value = window(1.0, 0.015);
        value.resets_at = Some(now + Duration::milliseconds(9_849_500));
        let projection = project(&value, now, false);
        assert_eq!(projection.severity, PaceSeverity::Healthy);
        assert!((projection.projected_used_percent.unwrap() - 66.445).abs() < 0.01);
    }

    #[test]
    fn exact_limit_and_zero_spare_have_no_run_out_time() {
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        for used in [50.0, 49.8] {
            let projection = project(&window(used, 0.5), now, false);
            assert_eq!(projection.severity, PaceSeverity::RunningOut);
            assert_eq!(projection.run_out_at, None);
        }
    }

    #[test]
    fn fresh_session_and_display_precision_match_the_visible_row() {
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        assert_eq!(
            project(&window(0.0, 0.5), now, true).severity,
            PaceSeverity::Untracked
        );
        assert_eq!(
            project(&window(0.0, 0.5), now, false).severity,
            PaceSeverity::Healthy
        );
        assert_ne!(
            project(&window(99.5, 0.5), now, false).severity,
            PaceSeverity::Spent
        );
        assert_eq!(
            project(&window(99.51, 0.5), now, false).severity,
            PaceSeverity::Spent
        );

        let mut dollars = window(99.0, 0.5);
        dollars.format = crate::models::QuotaFormat::Dollars;
        dollars.used_value = Some(9.996);
        dollars.limit_value = Some(10.0);
        assert_eq!(project(&dollars, now, false).severity, PaceSeverity::Spent);
    }

    fn threshold_fixture() -> (ProviderRegistry, AppSettings, ProviderSnapshot) {
        let registry = ProviderRegistry::from_definitions(vec![ProviderDefinition {
            id: "custom".into(),
            display_name: "Custom Provider".into(),
            short_name: "C".into(),
            fallback_enabled: true,
            local_usage_source_note: None,
            links: vec![],
            metrics: vec![MetricDefinition::new(
                "custom.weekly",
                "Weekly",
                MetricSource::Quota {
                    source_id: "weekly".into(),
                    session_window: false,
                },
                true,
                true,
                MetricSection::AlwaysVisible,
                false,
                Some("W"),
                None,
            )],
        }])
        .unwrap();
        let settings = AppSettings {
            providers: vec![ProviderLayout {
                id: "custom".into(),
                enabled: true,
                detected: true,
                expanded: false,
                metrics: vec![MetricLayout {
                    id: "custom.weekly".into(),
                    enabled: true,
                    section: MetricSection::AlwaysVisible,
                    pinned: false,
                }],
            }],
            notifications: NotificationPreferences {
                almost_out: true,
                cutting_it_close: true,
                will_run_out: true,
            },
            ..AppSettings::default()
        };
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        let snapshot = ProviderSnapshot {
            provider_id: "custom".into(),
            plan: None,
            quotas: vec![QuotaWindow {
                id: "weekly".into(),
                label: "Weekly".into(),
                used_percent: 80.0,
                resets_at: Some(now + Duration::hours(2)),
                period_seconds: 604_800,
                format: crate::models::QuotaFormat::Percent,
                used_value: None,
                limit_value: None,
                unit: None,
                estimated: false,
                source_note: None,
            }],
            value_metrics: Vec::new(),
            status_metrics: Vec::new(),
            notices: Vec::new(),
            usage: UsageHistory::default(),
            warnings: Vec::new(),
            refreshed_at: now,
        };
        (registry, settings, snapshot)
    }

    #[test]
    fn threshold_selection_chooses_the_highest_enabled_crossing() {
        let all = NotificationPreferences {
            almost_out: true,
            cutting_it_close: true,
            will_run_out: true,
        };
        assert_eq!(
            highest_crossed_threshold(99.0, NotificationThresholds::default(), &all)
                .unwrap()
                .level,
            ThresholdLevel::Critical
        );
        assert_eq!(
            highest_crossed_threshold(100.0, NotificationThresholds::default(), &all)
                .unwrap()
                .level,
            ThresholdLevel::Capped
        );
        let without_cap = NotificationPreferences {
            will_run_out: false,
            ..all
        };
        assert_eq!(
            highest_crossed_threshold(100.0, NotificationThresholds::default(), &without_cap)
                .unwrap()
                .level,
            ThresholdLevel::Critical
        );
        assert!(highest_crossed_threshold(79.9, NotificationThresholds::default(), &all).is_none());
    }

    #[test]
    fn evaluator_fires_once_rearms_on_reset_and_rolls_back_failed_delivery() {
        let directory = tempdir().unwrap();
        let storage = Arc::new(Storage::open(&directory.path().join("overcap.db")).unwrap());
        let evaluator = NotificationEvaluator::new(storage);
        let (registry, settings, mut snapshot) = threshold_fixture();
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();

        let first = evaluator.evaluate(&snapshot, &settings, &registry, now);
        assert_eq!(first.len(), 1);
        assert_eq!(first[0].message, "Custom Provider at 80%. Pace yourself.");
        assert!(evaluator
            .evaluate(&snapshot, &settings, &registry, now)
            .is_empty());

        evaluator.rollback(&first);
        assert_eq!(
            evaluator
                .evaluate(&snapshot, &settings, &registry, now)
                .len(),
            1
        );
        snapshot.quotas[0].resets_at = Some(now + Duration::hours(3));
        assert_eq!(
            evaluator
                .evaluate(&snapshot, &settings, &registry, now)
                .len(),
            1
        );
    }

    #[test]
    fn evaluator_advances_each_threshold_once_with_the_expected_voice() {
        let directory = tempdir().unwrap();
        let storage = Arc::new(Storage::open(&directory.path().join("overcap.db")).unwrap());
        let evaluator = NotificationEvaluator::new(storage);
        let (registry, settings, mut snapshot) = threshold_fixture();
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();

        let warning = evaluator.evaluate(&snapshot, &settings, &registry, now);
        assert_eq!(warning[0].message, "Custom Provider at 80%. Pace yourself.");

        snapshot.quotas[0].used_percent = 95.0;
        let critical = evaluator.evaluate(&snapshot, &settings, &registry, now);
        assert_eq!(critical.len(), 1);
        assert_eq!(critical[0].message, "95%. Redlining.");
        assert!(evaluator
            .evaluate(&snapshot, &settings, &registry, now)
            .is_empty());

        snapshot.quotas[0].used_percent = 100.0;
        let capped = evaluator.evaluate(&snapshot, &settings, &registry, now);
        assert_eq!(capped.len(), 1);
        assert!(capped[0].message.starts_with("Capped. Back at "));
        assert!(capped[0].message.ends_with('.'));
        assert!(evaluator
            .evaluate(&snapshot, &settings, &registry, now)
            .is_empty());
    }

    #[test]
    fn evaluator_skips_unknown_resets_disabled_metrics_and_uses_provider_overrides() {
        let directory = tempdir().unwrap();
        let storage = Arc::new(Storage::open(&directory.path().join("overcap.db")).unwrap());
        let evaluator = NotificationEvaluator::new(storage);
        let (registry, mut settings, mut snapshot) = threshold_fixture();
        let now = Utc.timestamp_opt(1_800_000_000, 0).unwrap();
        snapshot.quotas[0].resets_at = None;
        assert!(evaluator
            .evaluate(&snapshot, &settings, &registry, now)
            .is_empty());

        snapshot.quotas[0].resets_at = Some(now + Duration::hours(2));
        settings.providers[0].metrics[0].enabled = false;
        assert!(evaluator
            .evaluate(&snapshot, &settings, &registry, now)
            .is_empty());

        settings.providers[0].metrics[0].enabled = true;
        settings.provider_notification_thresholds.insert(
            "custom".into(),
            NotificationThresholds {
                warning: 70,
                critical: 90,
                capped: 99,
            },
        );
        snapshot.quotas[0].used_percent = 75.0;
        let alerts = evaluator.evaluate(&snapshot, &settings, &registry, now);
        assert_eq!(alerts[0].threshold, 70);
        assert_eq!(alerts[0].message, "Custom Provider at 70%. Pace yourself.");
    }
}
