import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Autenticación con Spotify
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=("bef200f48acf44a483841d4e2928183f"),
    client_secret=("d1d71acaca264be79b63ad72c78af448"),
    redirect_uri=("http://localhost:8888/callback"),
    scope=["playlist-modify-public", "playlist-modify-private"]
))

# Pedir al usuario los artistas
entrada = input("Ingresa los nombres de los artistas separados por coma: ")
artistas_lista = [nombre.strip() for nombre in entrada.split(",")]

todas_canciones_uris = []

for nombre_artista in artistas_lista:
    # Buscar artista
    resultados = sp.search(q=f'artist:"{nombre_artista}"', type="artist", limit=1)
    if not resultados['artists']['items']:
        print(f"⚠️ Artista '{nombre_artista}' no encontrado")
        continue
    artista = resultados['artists']['items'][0]
    artista_id = artista['id']

    # Top tracks
    top_tracks = sp.artist_top_tracks(artista_id)['tracks']
    top_tracks_uris = [track['uri'] for track in top_tracks]

    # Álbumes (limitamos a 5 para no exceder 1000 canciones)
    albumes = sp.artist_albums(artista_id, album_type='album', limit=5)['items']
    albumes_uris = []
    for album in albumes:
        pistas = sp.album_tracks(album['id'])['items']
        albumes_uris.extend([pista['uri'] for pista in pistas])

    todas_canciones_uris.extend(top_tracks_uris + albumes_uris)

# Eliminar duplicados
todas_canciones_uris = list(dict.fromkeys(todas_canciones_uris))

# Mezclar canciones
random.shuffle(todas_canciones_uris)

# Crear playlist
usuario_id = sp.current_user()['id']
playlist = sp.user_playlist_create(usuario_id, "Top Tracks Shuffle", public=True)

# Añadir canciones en bloques de 100
for i in range(0, len(todas_canciones_uris), 100):
    sp.playlist_add_items(playlist['id'], todas_canciones_uris[i:i+100])

print(f"\n✅ Playlist '{playlist['name']}' creada con {len(todas_canciones_uris)} canciones mezcladas.")
