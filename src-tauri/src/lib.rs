use reqwest;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Semaphore;

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
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    let text = resp
        .text()
        .await
        .map_err(|e| e.to_string())?;

    Ok(text)
}

#[derive(Clone, Deserialize)]
struct ProbeChannel {
    id: String,
    url: String,
}

#[derive(Serialize)]
struct ProbeResult {
    id: String,
    ok: bool,
}

async fn probe_channel(client: reqwest::Client, channel: ProbeChannel) -> ProbeResult {
    let ok = client
        .get(&channel.url)
        .header("User-Agent", "IPTVPlayer/1.0")
        .header("Range", "bytes=0-0")
        .send()
        .await
        .map(|resp| resp.status().is_success())
        .unwrap_or(false);

    ProbeResult { id: channel.id, ok }
}

#[tauri::command]
async fn test_channel_connectivity(channels: Vec<ProbeChannel>) -> Result<Vec<ProbeResult>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(6))
        .build()
        .map_err(|e| e.to_string())?;
    let semaphore = Arc::new(Semaphore::new(24));
    let mut handles = Vec::with_capacity(channels.len());

    for channel in channels {
        let client = client.clone();
        let semaphore = Arc::clone(&semaphore);
        handles.push(tokio::spawn(async move {
            let permit = semaphore.acquire_owned().await;
            if permit.is_err() {
                return ProbeResult { id: channel.id, ok: false };
            }
            probe_channel(client, channel).await
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        results.push(handle.await.map_err(|e| e.to_string())?);
    }

    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![fetch_playlist, test_channel_connectivity])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
