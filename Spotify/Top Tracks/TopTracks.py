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

# CONFIGURACIÓN DE LÍMITES
MAX_CANCIONES_PLAYLIST = 9900  # Dejamos margen antes del límite de 10,000
MAX_CANCIONES_POR_ARTISTA = 20  # Límite por artista (ajustable)

print(f"⚙️ Configuración actual:")
print(f"   - Máximo de canciones en playlist: {MAX_CANCIONES_PLAYLIST}")
print(f"   - Máximo de canciones por artista: {MAX_CANCIONES_POR_ARTISTA}")
cambiar = input("\n¿Quieres cambiar estos límites? [S/N]: ").strip().upper()
if cambiar == "S":
    MAX_CANCIONES_PLAYLIST = int(input("Nuevo límite total de playlist: "))
    MAX_CANCIONES_POR_ARTISTA = int(input("Nuevo límite por artista: "))

# Crear nueva playlist o usar existente
opcion = input("\n¿Quieres crear una nueva playlist (C) o usar una existente (E)? [C/E]: ").strip().upper()

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
contador_artistas_procesados = 0

for nombre_artista in artistas_lista:
    # Verificar si ya alcanzamos el límite
    if len(todas_canciones_uris) >= MAX_CANCIONES_PLAYLIST:
        print(f"\n⚠️ Se alcanzó el límite de {MAX_CANCIONES_PLAYLIST} canciones.")
        print(f"   Artistas procesados: {contador_artistas_procesados}/{len(artistas_lista)}")
        break
    
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
    
    # Top tracks
    top_tracks = sp.artist_top_tracks(artista_id)['tracks']
    canciones_artista = [track['uri'] for track in top_tracks]
    
    # Si queremos más canciones, añadimos de álbumes populares
    if len(canciones_artista) < MAX_CANCIONES_POR_ARTISTA:
        albumes = sp.artist_albums(artista_id, album_type='album', limit=5)['items']
        for album in albumes:
            if len(canciones_artista) >= MAX_CANCIONES_POR_ARTISTA:
                break
            pistas = sp.album_tracks(album['id'])['items']
            for pista in pistas:
                if len(canciones_artista) >= MAX_CANCIONES_POR_ARTISTA:
                    break
                canciones_artista.append(pista['uri'])
    
    # Limitar canciones por artista
    canciones_artista = canciones_artista[:MAX_CANCIONES_POR_ARTISTA]
    todas_canciones_uris.extend(canciones_artista)
    
    contador_artistas_procesados += 1
    print(f"🎶 {contador_artistas_procesados}/{len(artistas_lista)}: {artista_nombre} - {len(canciones_artista)} canciones añadidas")

# Limitar al máximo de la playlist
if len(todas_canciones_uris) > MAX_CANCIONES_PLAYLIST:
    print(f"\n⚠️ Recortando de {len(todas_canciones_uris)} a {MAX_CANCIONES_PLAYLIST} canciones")
    todas_canciones_uris = todas_canciones_uris[:MAX_CANCIONES_PLAYLIST]

# Obtener canciones actuales de la playlist
canciones_existentes = []
offset = 0
while True:
    response = sp.playlist_items(playlist_id, offset=offset, fields="items.track.uri,next")
    if not response['items']:
        break
    canciones_existentes.extend([item['track']['uri'] for item in response['items'] if item['track']])
    if not response['next']:
        break
    offset += len(response['items'])

# Filtrar solo canciones nuevas
canciones_a_añadir = [uri for uri in todas_canciones_uris if uri not in canciones_existentes]

# Verificar que no excedamos el límite con las nuevas canciones
total_final = len(canciones_existentes) + len(canciones_a_añadir)
if total_final > MAX_CANCIONES_PLAYLIST:
    exceso = total_final - MAX_CANCIONES_PLAYLIST
    print(f"\n⚠️ Al añadir todas las canciones se excedería el límite por {exceso} canciones")
    print(f"   Se añadirán solo {len(canciones_a_añadir) - exceso} canciones nuevas")
    canciones_a_añadir = canciones_a_añadir[:len(canciones_a_añadir) - exceso]

# Añadir canciones nuevas en lotes de 100
for i in range(0, len(canciones_a_añadir), 100):
    sp.playlist_add_items(playlist_id, canciones_a_añadir[i:i+100])

print(f"\n✅ Proceso completado:")
print(f"   Canciones añadidas nuevas: {len(canciones_a_añadir)}")
print(f"   Total en playlist: {len(canciones_existentes) + len(canciones_a_añadir)}")
print(f"   Espacio restante: {MAX_CANCIONES_PLAYLIST - (len(canciones_existentes) + len(canciones_a_añadir))}")

# Mezclar playlist con restricciones suaves (opcional)
mezclar = input("\n¿Quieres mezclar la playlist ahora para evitar artistas/albúm consecutivos? [S/N]: ").strip().upper()
if mezclar == "S":
    # Obtener todas las canciones con info básica
    canciones_info = []
    offset = 0
    print("Obteniendo información de canciones...")
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
        print("Mezclando playlist...")
        for intento in range(max_intentos):
            if intento % 1000 == 0 and intento > 0:
                print(f"  Intento {intento}/{max_intentos}...")
            random.shuffle(tracks)
            valido = True
            for i in range(1, len(tracks)):
                if tracks[i]['artist'] == tracks[i-1]['artist'] or tracks[i]['album'] == tracks[i-1]['album']:
                    valido = False
                    break
            if valido:
                print(f"  ✓ Mezcla perfecta encontrada en intento {intento + 1}")
                return tracks
        print("  ⚠️ No se encontró mezcla perfecta, usando la última generada")
        return tracks

    canciones_mezcladas = mezclar_suave(canciones_info)

    # Reemplazar playlist con la mezcla final (en lotes de 100)
    print("Aplicando la mezcla a la playlist...")
    # Primero vaciar la playlist
    for i in range(0, len(canciones_mezcladas), 100):
        if i == 0:
            sp.playlist_replace_items(playlist_id, [t['uri'] for t in canciones_mezcladas[i:i+100]])
        else:
            sp.playlist_add_items(playlist_id, [t['uri'] for t in canciones_mezcladas[i:i+100]])

    print(f"✅ Playlist mezclada con {len(canciones_mezcladas)} canciones.")