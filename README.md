# Greenhouse Backend

Acesta este backend-ul pentru proiectul de **seră inteligentă**, creat pentru a colecta și procesa date de la senzori, și pentru a le face disponibile printr-un API pentru frontend.

## Tehnologii folosite
- **Node.js** - pentru server și logica backend
- **Express.js** - pentru crearea API-urilor
- **MySQL / InfluxDB** - pentru stocarea datelor
- **MQTT** - pentru comunicarea cu senzori și actuatoare

## Funcționalități
- Colectarea datelor de la senzori (temperatură, umiditate etc.)
- Stocarea datelor în baza de date
- Trimiterea datelor către frontend prin API
- Controlul actuatoarelor (ex: ventilatoare, pompe)
- Posibilitate de extindere pentru dashboard și automatizări

## Instalare
1. Clonează repository-ul:  
   ```bash
   git clone https://github.com/sasa01fr/Greenhouse-backend.git
Cum să folosești proiectul

Conectarea la senzori

Configurează ESP32 sau alt microcontroler să trimită date la broker-ul MQTT specificat în .env.

Exemplu topic MQTT: greenhouse/sensor

Accesarea datelor prin API

Serverul expune endpoint-uri pentru a prelua datele stocate:

GET /sensors – obține toate datele senzorilor

GET /sensors/latest – obține cea mai recentă valoare a fiecărui senzor

Controlul actuatoarelor

Trimite comenzi către actuatoare prin MQTT sau API pentru a controla ventilatoare, pompe etc.

Extindere

Poți adăuga dashboard-uri frontend conectate la API

Se pot adăuga reguli automate bazate pe valori de temperatură sau umiditate

Contribuții

Contribuțiile sunt binevenite! Deschide un pull request sau un issue pentru sugestii și îmbunătățiri.
