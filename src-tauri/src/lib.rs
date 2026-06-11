use reqwest;

#[tauri::command]
async fn fetch_playlist(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .header("User-Agent", "IPTVPlayer/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp
        .text()
        .await
        .map_err(|e| e.to_string())?;

    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![fetch_playlist])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
