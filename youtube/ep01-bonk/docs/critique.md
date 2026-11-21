# Prüfer – Bewertungsrunden Ep. 01

## Runde 1
Probleme: (1) Bloom überstrahlt das ganze Bild, alles milchig. (2) Kamera in allen Szenen zu nah, im Hochformat waren die Figuren abgeschnitten. (3) In Szene 4 stand Bix im Boss-Würfel.
Fix: Bloom aus, alle Kameras weiter weg mit größerem Bildwinkel, Bix vor den Boss gesetzt.

## Runde 2
Probleme: (1) „BONK“-Schrift links abgeschnitten und über Bix' Kopf. (2) In Szene 4 war Bix vom Boss verdeckt. (3) Renderzeit zu hoch (Software-WebGL).
Fix: Schrift kleiner und höher, Boss gedreht, Kamera nach links versetzt, 30 fps mit 3 Bewegungsunschärfe-Samples.

## Runde 3 (Endkontrolle)
Datei: 1080×1920, 30 fps, yuv420p, 12,0 s, Ton auf −14 LUFS. Der Loop springt nahtlos zurück zu Bild 1.
Bewertung: Hook 8 · Lesbarkeit am Handy 8 · Bewegung 7 · Abwechslung 8 · Ton-Sync 8.
Offen für v2: Bix' Bonk-Pose kippt etwas zu stark nach vorn; Szene 5 hat noch kein „Klirren“ beim Aufprall des Schwerts; eigener Musik-Drop könnte härter sein.

# v2 (nach Feedback „zu schnell, man checkt nichts“)

## Runde 1
Probleme: (1) „HAHA“-Blasen und Pfeil falsch platziert, weil die Bildschirmposition mit der Kamera des vorherigen Frames berechnet wurde. (2) Bix beim Auslachen halb aus dem Bild. (3) Hook-Text erst nach 1 s.
Fix: Kamera-Matrix vor der Projektion aktualisieren, neue Kamera über die Schulter, Text ab Frame 0.

## Runde 2
Probleme: (1) „HAHA“ am linken Rand abgeschnitten. (2) „a BAGUETTE?!“ links abgeschnitten. (3) Bonk-Szene zeigt Bix von hinten.
Fix: Labels in den sicheren Bereich geklemmt, Bix dreht sich zur Kamera, Schleime näher an der Kamera.
