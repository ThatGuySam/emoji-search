use arboard::Clipboard;
use serde::Serialize;
use std::{ffi::c_void, ptr, thread, time::Duration};
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const WINDOW_LABEL: &str = "main";
const OPEN_SCRIPT: &str = "window.dispatchEvent(new Event('fetchmoji:open'))";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HostActionResult {
    mode: &'static str,
    message: String,
}

fn validate_emoji(value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err("No emoji was selected.".into());
    }

    if value.len() > 64 {
        return Err("The selected emoji sequence is unexpectedly long.".into());
    }

    if value
        .chars()
        .any(|character| matches!(character as u32, 0x00..=0x1f | 0x7f..=0x9f))
    {
        return Err("The selected value contains control characters.".into());
    }

    Ok(())
}

fn palette_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window(WINDOW_LABEL)
        .ok_or_else(|| "The emoji palette window is unavailable.".into())
}

fn show_palette(app: &AppHandle) -> Result<(), String> {
    let window = palette_window(app)?;

    #[cfg(target_os = "macos")]
    app.show().map_err(|error| error.to_string())?;

    window.center().map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    window
        .eval(OPEN_SCRIPT)
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn hide_palette(app: &AppHandle) -> Result<(), String> {
    let window = palette_window(app)?;
    window.hide().map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    app.hide().map_err(|error| error.to_string())?;

    Ok(())
}

fn toggle_palette(app: &AppHandle) -> Result<(), String> {
    let window = palette_window(app)?;
    if window.is_visible().map_err(|error| error.to_string())? {
        hide_palette(app)
    } else {
        show_palette(app)
    }
}

#[tauri::command]
fn dismiss_palette(app: AppHandle) -> Result<(), String> {
    hide_palette(&app)
}

#[tauri::command]
async fn insert_emoji(app: AppHandle, emoji: String) -> Result<HostActionResult, String> {
    validate_emoji(&emoji)?;

    let clipboard_value = emoji.clone();
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
        clipboard
            .set_text(clipboard_value)
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())??;

    hide_palette(&app)?;

    let pasted = tauri::async_runtime::spawn_blocking(|| {
        thread::sleep(Duration::from_millis(90));
        paste_from_clipboard()
    })
    .await
    .map_err(|error| error.to_string())?;

    if pasted {
        Ok(HostActionResult {
            mode: "pasted",
            message: format!("{emoji} pasted"),
        })
    } else {
        Ok(HostActionResult {
            mode: "copied",
            message: format!("{emoji} copied — allow Accessibility access to paste automatically"),
        })
    }
}

#[cfg(target_os = "macos")]
fn paste_from_clipboard() -> bool {
    unsafe {
        if !CGPreflightPostEventAccess() && !CGRequestPostEventAccess() {
            return false;
        }

        let key_down = CGEventCreateKeyboardEvent(ptr::null_mut(), 9, true);
        let key_up = CGEventCreateKeyboardEvent(ptr::null_mut(), 9, false);
        if key_down.is_null() || key_up.is_null() {
            if !key_down.is_null() {
                CFRelease(key_down);
            }
            if !key_up.is_null() {
                CFRelease(key_up);
            }
            return false;
        }

        CGEventSetFlags(key_down, 1 << 20);
        CGEventSetFlags(key_up, 1 << 20);
        CGEventPost(0, key_down);
        CGEventPost(0, key_up);
        CFRelease(key_down);
        CFRelease(key_up);
        true
    }
}

#[cfg(not(target_os = "macos"))]
fn paste_from_clipboard() -> bool {
    false
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn CGPreflightPostEventAccess() -> bool;
    fn CGRequestPostEventAccess() -> bool;
    fn CGEventCreateKeyboardEvent(
        source: *mut c_void,
        virtual_key: u16,
        key_down: bool,
    ) -> *mut c_void;
    fn CGEventSetFlags(event: *mut c_void, flags: u64);
    fn CGEventPost(tap: u32, event: *mut c_void);
    fn CFRelease(value: *const c_void);
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![insert_emoji, dismiss_palette])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.handle()
                    .set_activation_policy(tauri::ActivationPolicy::Accessory)?;
                app.handle().set_dock_visibility(false)?;
            }

            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::META), Code::Period);
            let registered_shortcut = shortcut;

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, incoming, event| {
                        if incoming == &registered_shortcut
                            && event.state() == ShortcutState::Pressed
                        {
                            if let Err(error) = toggle_palette(app) {
                                eprintln!("Could not toggle FetchMoji: {error}");
                            }
                        }
                    })
                    .build(),
            )?;

            app.global_shortcut().register(shortcut).map_err(|error| {
                format!(
                    "Could not register Control-Command-.. Another app may already use it: {error}"
                )
            })?;

            if std::env::var_os("FETCHMOJI_SHOW_ON_LAUNCH").is_some() {
                show_palette(app.handle())?;
            } else {
                hide_palette(app.handle())?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the FetchMoji Tauri prototype");
}

#[cfg(test)]
mod tests {
    use super::validate_emoji;

    #[test]
    fn accepts_emoji_sequences() {
        assert!(validate_emoji("👨‍👩‍👧‍👦").is_ok());
        assert!(validate_emoji("👍🏽").is_ok());
    }

    #[test]
    fn rejects_empty_and_control_values() {
        assert!(validate_emoji("").is_err());
        assert!(validate_emoji("🙂\n").is_err());
    }
}
