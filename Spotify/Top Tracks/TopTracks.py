import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Autenticación con Spotify
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIPY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI"),
    scope=["playlist-modify-public", "playlist-modify-private"]
))


usuario_id = sp.current_user()['id']

# Preguntar si crear nueva playlist o usar existente
opcion = input("¿Quieres crear una nueva playlist (C) o usar una existente (E)? [C/E]: ").strip().upper()

if opcion == "C":
    nombre_playlist = input("Ingresa el nombre de la nueva playlist: ").strip()
    playlist = sp.user_playlist_create(usuario_id, nombre_playlist, public=True)
else:
    # Listar playlists existentes
    playlists = sp.current_user_playlists(limit=50)['items']
    print("\nPlaylists existentes:")
    for i, pl in enumerate(playlists, 1):
        print(f"{i}. {pl['name']}")
    eleccion = int(input("Selecciona el número de la playlist: "))
    playlist = playlists[eleccion - 1]

# Solicitar varios artistas
entrada = input("\nIngresa los nombres de los artistas separados por coma: ")
artistas_lista = [nombre.strip() for nombre in entrada.split(",")]

todas_canciones_uris = []

for nombre_artista in artistas_lista:
    resultados = sp.search(q=f'artist:"{nombre_artista}"', type="artist", limit=5)
    artista = None
    for a in resultados['artists']['items']:
        if a['name'].lower() == nombre_artista.lower():
            artista = a
            break

    if artista is None:
        print(f"⚠️ Artista '{nombre_artista}' no encontrado exactamente.")
        continue

    artista_id = artista['id']
    artista_nombre = artista['name']
    print(f"\n🎶 Procesando artista: {artista_nombre}")

    # Top tracks
    top_tracks = sp.artist_top_tracks(artista_id)['tracks']
    top_tracks_uris = [track['uri'] for track in top_tracks]

    # Álbumes más populares (limitamos a 10)
    albumes = sp.artist_albums(artista_id, album_type='album', limit=10)['items']
    albumes_uris = []
    for album in albumes:
        pistas = sp.album_tracks(album['id'])['items']
        albumes_uris.extend([pista['uri'] for pista in pistas])

    todas_canciones_uris.extend(top_tracks_uris + albumes_uris)

# Eliminar duplicados
todas_canciones_uris = list(dict.fromkeys(todas_canciones_uris))

# Añadir canciones a la playlist en lotes de 100
for i in range(0, len(todas_canciones_uris), 100):
    sp.playlist_add_items(playlist['id'], todas_canciones_uris[i:i+100])

print(f"\n✅ Canciones añadidas a la playlist '{playlist['name']}' con éxito.")
print(f"Total canciones añadidas: {len(todas_canciones_uris)}")
