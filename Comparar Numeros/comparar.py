# Script para encontrar números coincidentes entre dos listas

# Primera lista
lista1 = """
49, 94, 42, 317, 576, 728, 509, 701, 323, 402, 930, 206, 387, 784, 171, 82, 613, 559, 649, 510, 
660, 888, 115, 565, 626, 18, 895, 760, 931, 362, 828, 255, 311, 131, 68, 639, 48, 445, 319, 225, 
819, 811, 253, 272, 968, 456, 183, 261, 76, 392, 237, 568, 25, 674, 971, 912, 876, 56, 433, 474, 
271, 161, 791, 408, 320, 345, 713, 683, 463, 960, 336, 849, 883, 426, 363, 793, 458, 617, 662, 
775, 697, 27, 972, 932, 342, 391, 123, 178, 431, 254, 150, 462, 344, 412, 627, 848, 335, 176, 695, 847
"""

# Segunda lista
lista2 = """
101, 695, 627, 171, 954, 282, 790, 919, 837, 678, 188, 881, 964, 870, 243, 57, 655, 29, 334, 806, 
164, 633, 323, 183, 166, 540, 968, 742, 907, 133, 140, 938, 444, 335, 364, 126, 747, 590, 307, 
947, 959, 281, 822, 248, 559, 956, 192, 386, 845, 657, 407, 353, 250, 624, 440, 72, 300, 2, 691, 
942, 203, 191, 632, 340, 271, 934, 612, 960, 406, 830, 867, 467, 489, 610, 882, 832, 986, 767, 
487, 711, 66, 107, 511, 828, 741, 513, 439, 480, 265, 733, 168, 124, 355, 469, 716, 705, 419, 43, 680, 792
"""

# Convertir las listas en conjuntos de enteros
set1 = set(int(x.strip()) for x in lista1.replace("\n", "").split(",") if x.strip())
set2 = set(int(x.strip()) for x in lista2.replace("\n", "").split(",") if x.strip())

# Encontrar números coincidentes
coincidentes = sorted(set1.intersection(set2))

# Guardar resultados en un archivo de texto
with open("coincidentes.txt", "w", encoding="utf-8") as f:
    for numero in coincidentes:
        f.write(str(numero) + "\n")

print("Archivo 'coincidentes.txt' generado con éxito.")
print("Números coincidentes:", coincidentes)
