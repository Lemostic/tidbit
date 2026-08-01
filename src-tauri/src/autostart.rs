use crate::error::AppError;

const APP_VALUE_NAME: &str = "tidbit";

fn startup_command(executable: &std::path::Path) -> String {
    format!("\"{}\"", executable.display())
}

#[cfg(target_os = "windows")]
pub fn is_enabled() -> Result<bool, AppError> {
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
pub fn set_enabled(enabled: bool) -> Result<(), AppError> {
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

#[cfg(not(target_os = "windows"))]
pub fn is_enabled() -> Result<bool, AppError> {
    Ok(false)
}

#[cfg(not(target_os = "windows"))]
pub fn set_enabled(_enabled: bool) -> Result<(), AppError> {
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
