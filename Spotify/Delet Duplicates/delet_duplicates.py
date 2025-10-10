import spotipy
from spotipy.oauth2 import SpotifyOAuth
from collections import defaultdict
import os
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
    scope='playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private'
))

# Pedir URL de la playlist
playlist_url = input("Introduce la URL de la playlist pública o privada: ")

# Extraer playlist ID
if "playlist/" in playlist_url:
    playlist_id = playlist_url.split("playlist/")[1].split("?")[0]
else:
    playlist_id = playlist_url  # Si el usuario solo pone el ID

# Obtener todas las canciones de la playlist
tracks = []
offset = 0
while True:
    results = sp.playlist_items(
        playlist_id, offset=offset,
        fields="items.track.id,items.track.name,items.track.artists(name),next"
    )
    tracks.extend(results["items"])
    if results["next"] is None:
        break
    offset += len(results["items"])

# Agrupar por duplicados
duplicados_grupos = defaultdict(list)

for idx, item in enumerate(tracks):
    track = item["track"]
    if not track:
        continue
    name = track["name"].strip().lower()
    artists = ", ".join([a["name"].strip().lower() for a in track["artists"]])
    clave = (name, artists)
    # Guardamos también la posición en la playlist
    duplicados_grupos[clave].append({"track": track, "pos": idx + 1})

# Filtrar grupos con más de una aparición
duplicados_grupos = {k: v for k, v in duplicados_grupos.items() if len(v) > 1}

if not duplicados_grupos:
    print("✅ No hay duplicados.")
else:
    tracks_to_delete = []

    for clave, group in duplicados_grupos.items():
        track_info = group[0]["track"]
        print(f"\n🎵 Duplicado: {track_info['name']} - {', '.join([a['name'] for a in track_info['artists']])}")
        print("Opciones:")
        for i, t in enumerate(group, 1):
            track_obj = t["track"]
            print(f"{i}. Posición {t['pos']}: {track_obj['name']} - {', '.join([a['name'] for a in track_obj['artists']])}")
        to_delete = input("Introduce los números de las canciones a borrar separados por coma (ej. 1,3) o 'ninguna': ")
        
        if to_delete.lower() != "ninguna":
            indices = [int(x.strip()) - 1 for x in to_delete.split(",") if x.strip().isdigit()]
            for i in indices:
                if 0 <= i < len(group):
                    tracks_to_delete.append(group[i]["track"]["id"])

    if tracks_to_delete:
        sp.playlist_remove_all_occurrences_of_items(playlist_id, tracks_to_delete)
        print("\n✅ Canciones eliminadas correctamente.")
    else:
        print("\n❌ No se eliminó ninguna canción.")
