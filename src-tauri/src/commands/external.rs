use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const ALLOWED_ORIGINS: [&str; 2] = ["https://overcap.dev", "https://github.com"];

fn is_allowed_external_url(url: &str) -> bool {
    if url.chars().any(char::is_whitespace) || url.chars().any(char::is_control) {
        return false;
    }

    ALLOWED_ORIGINS.iter().any(|origin| {
        url.strip_prefix(origin).is_some_and(|suffix| {
            suffix.is_empty()
                || suffix.starts_with('/')
                || suffix.starts_with('?')
                || suffix.starts_with('#')
        })
    })
}

#[tauri::command]
pub fn open_external_link(app: AppHandle, url: String) -> Result<(), String> {
    if !is_allowed_external_url(&url) {
        return Err("That link isn't allowed.".to_owned());
    }

    crate::app_debug!(
        "http",
        "opening product link {}",
        crate::logging::redact_url(&url)
    );
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|_| "That link couldn't be opened.".to_owned())
}

#[cfg(test)]
mod tests {
    use super::is_allowed_external_url;

    #[test]
    fn accepts_https_links_on_the_product_and_github_origins() {
        assert!(is_allowed_external_url("https://overcap.dev"));
        assert!(is_allowed_external_url("https://overcap.dev/download"));
        assert!(is_allowed_external_url(
            "https://github.com/example/project#readme"
        ));
    }

    #[test]
    fn rejects_lookalike_hosts_and_non_https_links() {
        for url in [
            "http://overcap.dev",
            "https://docs.overcap.dev",
            "https://overcap.dev.example.com",
            "https://overcap.dev@evil.example",
            "https://github.com.evil.example/project",
            "https://github.com:443/project",
            "https://github.com\\@evil.example/project",
            "https://github.com/\nproject",
        ] {
            assert!(
                !is_allowed_external_url(url),
                "unexpectedly allowed {url:?}"
            );
        }
    }
}
