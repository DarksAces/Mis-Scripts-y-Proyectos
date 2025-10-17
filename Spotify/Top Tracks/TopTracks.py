import os
import random
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Autenticación con Spotify
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=os.getenv("SPOTIFY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
        redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
        scope='user-library-read playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private'
    ))
usuario_id = sp.current_user()['id']

# Crear nueva playlist o usar existente
opcion = input("¿Quieres crear una nueva playlist (C) o usar una existente (E)? [C/E]: ").strip().upper()

if opcion == "C":
    nombre_playlist = input("Ingresa el nombre de la nueva playlist: ").strip()
    playlist = sp.user_playlist_create(usuario_id, nombre_playlist, public=True)
else:
    playlists = sp.current_user_playlists(limit=50)['items']
    print("\nPlaylists existentes:")
    for i, pl in enumerate(playlists, 1):
        print(f"{i}. {pl['name']}")
    eleccion = int(input("Selecciona el número de la playlist: "))
    playlist = playlists[eleccion - 1]

playlist_id = playlist['id']

# Solicitar artistas
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

# Obtener canciones actuales de la playlist
canciones_existentes = []
offset = 0
while True:
    response = sp.playlist_items(playlist_id, offset=offset, fields="items.track.uri,next")
    if not response['items']:
        break
    canciones_existentes.extend([item['track']['uri'] for item in response['items']])
    if not response['next']:
        break
    offset += len(response['items'])

# Filtrar solo canciones nuevas
canciones_a_añadir = [uri for uri in todas_canciones_uris if uri not in canciones_existentes]

# Añadir canciones nuevas en lotes de 100
for i in range(0, len(canciones_a_añadir), 100):
    sp.playlist_add_items(playlist_id, canciones_a_añadir[i:i+100])

print(f"\n✅ Canciones añadidas a la playlist '{playlist['name']}' con éxito.")
print(f"Total canciones añadidas nuevas: {len(canciones_a_añadir)}")
print(f"Total canciones en la playlist ahora: {len(canciones_existentes) + len(canciones_a_añadir)}")

# Mezclar playlist con restricciones suaves (opcional)
mezclar = input("\n¿Quieres mezclar la playlist ahora para evitar artistas/albúm consecutivos? [S/N]: ").strip().upper()
if mezclar == "S":
    # Obtener todas las canciones con info básica
    canciones_info = []
    offset = 0
    while True:
        response = sp.playlist_items(playlist_id, offset=offset, fields="items.track(uri,name,artists,album(name)),next")
        if not response['items']:
            break
        for item in response['items']:
            track = item['track']
            if track:
                canciones_info.append({
                    "uri": track['uri'],
                    "artist": track['artists'][0]['name'],
                    "album": track['album']['name'],
                    "name": track['name']
                })
        if not response['next']:
            break
        offset += len(response['items'])

    # Función de mezcla suave
    def mezclar_suave(tracks, max_intentos=5000):
        for _ in range(max_intentos):
            random.shuffle(tracks)
            valido = True
            for i in range(1, len(tracks)):
                if tracks[i]['artist'] == tracks[i-1]['artist'] or tracks[i]['album'] == tracks[i-1]['album']:
                    valido = False
                    break
            if valido:
                return tracks
        return tracks

    canciones_mezcladas = mezclar_suave(canciones_info)

    # Reemplazar playlist con la mezcla final
    for i in range(0, len(canciones_mezcladas), 100):
        sp.playlist_replace_items(playlist_id, [t['uri'] for t in canciones_mezcladas[i:i+100]])

    print(f"✅ Playlist mezclada con {len(canciones_mezcladas)} canciones.")
