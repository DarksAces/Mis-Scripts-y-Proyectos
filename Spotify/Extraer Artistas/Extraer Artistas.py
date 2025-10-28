import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# Configuración de credenciales
CLIENT_ID = 'tu_client_id_aqui'
CLIENT_SECRET = 'tu_client_secret_aqui'

# Autenticación
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET
))

def obtener_artistas_playlist(playlist_url):
    """
    Extrae todos los artistas de una playlist de Spotify
    
    Args:
        playlist_url: URL completa de la playlist o solo el ID
    
    Returns:
        String con artistas separados por comas
    """
    # Extraer el ID de la playlist de la URL
    if 'playlist/' in playlist_url:
        playlist_id = playlist_url.split('playlist/')[-1].split('?')[0]
    else:
        playlist_id = playlist_url
    
    # Obtener información de la playlist
    resultados = sp.playlist_tracks(playlist_id)
    tracks = resultados['items']
    
    # Si hay más de 100 canciones, obtener el resto
    while resultados['next']:
        resultados = sp.next(resultados)
        tracks.extend(resultados['items'])
    
    # Extraer artistas únicos
    artistas = set()
    for item in tracks:
        if item['track'] and item['track']['artists']:
            for artist in item['track']['artists']:
                artistas.add(artist['name'])
    
    # Convertir a lista ordenada y unir con comas
    artistas_ordenados = sorted(list(artistas))
    return ', '.join(artistas_ordenados)

# Uso del script
if __name__ == "__main__":
    # Pega aquí la URL de tu playlist
    playlist_url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
    
    try:
        artistas = obtener_artistas_playlist(playlist_url)
        print("Artistas en la playlist:")
        print(artistas)
        
        # Guardar en archivo (opcional)
        with open('artistas_spotify.txt', 'w', encoding='utf-8') as f:
            f.write(artistas)
        print("\n✓ Artistas guardados en 'artistas_spotify.txt'")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Verifica que la URL de la playlist sea correcta y pública")