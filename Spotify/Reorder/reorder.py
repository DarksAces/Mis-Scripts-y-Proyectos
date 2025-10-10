import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os

# Autenticación
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
    scope='playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private'
))

# 1️⃣ Listar playlists
playlists = sp.current_user_playlists(limit=50)['items']
if not playlists:
    print("No se encontraron playlists.")
    exit()

print("\nTus playlists:")
for i, p in enumerate(playlists, 1):
    print(f"{i}. {p['name']} → {p['id']}")

# 2️⃣ Elegir playlist
try:
    playlist_idx = int(input("\nElige el número de la playlist donde quieres mover canciones: ")) - 1
    playlist_id = playlists[playlist_idx]['id']
except (ValueError, IndexError):
    print("Selección inválida.")
    exit()

# 3️⃣ Pedir nombre del artista
artist_name_input = input("Escribe el nombre del artista que quieres mover al final: ").lower().strip()

# 4️⃣ Obtener todos los tracks de la playlist (paginar si hay más de 100)
tracks = []
offset = 0
while True:
    response = sp.playlist_tracks(playlist_id, limit=100, offset=offset)
    tracks.extend(response['items'])
    if len(response['items']) < 100:
        break
    offset += 100

# 5️⃣ Encontrar índices de las canciones del artista (coincidencia parcial)
indices = []
for i, t in enumerate(tracks):
    track_artists = [a['name'].lower().strip() for a in t['track']['artists']]
    if any(artist_name_input in a for a in track_artists):
        indices.append(i)

if not indices:
    print(f"No se encontraron canciones de '{artist_name_input}' en esta playlist.")
    exit()

# 6️⃣ Reordenar las canciones del artista al final (de atrás hacia adelante)
for idx in reversed(indices):
    sp.playlist_reorder_items(playlist_id, range_start=idx, insert_before=len(tracks))
    tracks.append(tracks.pop(idx))

print(f"\nTodas las canciones de '{artist_name_input}' se han movido al final de la playlist '{playlists[playlist_idx]['name']}'.")
