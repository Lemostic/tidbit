use crate::error::AppError;

#[cfg(target_os = "windows")]
const APP_VALUE_NAME: &str = "tidbit";

#[cfg(any(target_os = "windows", test))]
fn startup_command(executable: &std::path::Path) -> String {
    format!("\"{}\"", executable.display())
}

#[cfg(target_os = "windows")]
pub fn is_enabled<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) -> Result<bool, AppError> {
    use std::io::ErrorKind;
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    let run_key =
        match current_user.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run") {
            Ok(key) => key,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(false),
            Err(error) => return Err(error.into()),
        };

    match run_key.get_value::<String, _>(APP_VALUE_NAME) {
        Ok(command) => Ok(!command.trim().is_empty()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error.into()),
    }
}

#[cfg(target_os = "windows")]
pub fn set_enabled<R: tauri::Runtime>(
    _app: &tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), AppError> {
    use std::io::ErrorKind;
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) =
        current_user.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")?;

    if enabled {
        let executable = std::env::current_exe()?;
        run_key.set_value(APP_VALUE_NAME, &startup_command(&executable))?;
    } else if let Err(error) = run_key.delete_value(APP_VALUE_NAME) {
        if error.kind() != ErrorKind::NotFound {
            return Err(error.into());
        }
    }

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn is_enabled<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<bool, AppError> {
    use tauri_plugin_autostart::ManagerExt;

    app.autolaunch()
        .is_enabled()
        .map_err(|error| AppError::Migration(error.to_string()))
}

#[cfg(target_os = "macos")]
pub fn set_enabled<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), AppError> {
    use tauri_plugin_autostart::ManagerExt;

    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    result.map_err(|error| AppError::Migration(error.to_string()))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn is_enabled<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) -> Result<bool, AppError> {
    Ok(false)
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn set_enabled<R: tauri::Runtime>(
    _app: &tauri::AppHandle<R>,
    _enabled: bool,
) -> Result<(), AppError> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::startup_command;
    use std::path::Path;

    #[test]
    fn quotes_the_executable_path_for_the_windows_run_key() {
        assert_eq!(
            startup_command(Path::new(r"C:\Program Files\tidbit\tidbit.exe")),
            r#""C:\Program Files\tidbit\tidbit.exe""#
        );
    }
}
