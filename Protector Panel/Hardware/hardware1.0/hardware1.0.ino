

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <WiFiManager.h>
#include <ESP8266WebServer.h>

const unsigned long resetThreshold = 3000; // 3 segundos en milisegundos
unsigned long buttonPressedTime = 0;
bool resetButtonPressed = false;

const int Button1 = D5;
const int Button2 = D6;
const int Button3 = D8;
const int Button4 = D3;

const int Led1 = 1; 
const int Led2 = 3; 
const int Led3 = D0; 
const int Led4 = D7; 

const int DHTPIN = D4;
const int DHTTYPE = DHT11; // O cambia a DHT22 si estás usando ese sensor

volatile int valor1 = 0;
volatile int valor2 = 0;
volatile int valor3 = 0;
volatile int valor4 = 0;

volatile bool bandera1 = false;
volatile bool bandera2 = false;
volatile bool bandera3 = false;
volatile bool bandera4 = false;

volatile const unsigned long debounceDelay = 200; // Tiempo de antirrebote en milisegundos

unsigned long lastButton1Time = 0;
unsigned long lastButton2Time = 0;
unsigned long lastButton3Time = 0;
unsigned long lastButton4Time = 0;

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
FirebaseData firebaseData;
ESP8266WebServer server(80);

void setupFirebase() {
  Firebase.begin("tusdatos.firebaseio.com", "tu token");
  Firebase.reconnectWiFi(true);
}

void ICACHE_RAM_ATTR button1Interrupt() {
  unsigned long currentTime = millis();
  if (currentTime - lastButton1Time > debounceDelay){
    bandera1=true;
    if(valor1==1){
      digitalWrite(Led1, LOW);
    }
    else
      digitalWrite(Led1, HIGH);
    lastButton1Time = currentTime;
  }
}
void ICACHE_RAM_ATTR button2Interrupt() {
  unsigned long currentTime = millis();
  if (currentTime - lastButton1Time > debounceDelay){
    bandera2=true;
     if(valor2==1){
      digitalWrite(Led2, LOW);
    }
    else
      digitalWrite(Led2, HIGH);
    lastButton2Time = currentTime;
  }
}

void ICACHE_RAM_ATTR button3Interrupt() {
  unsigned long currentTime = millis();
  if (currentTime - lastButton1Time > debounceDelay){
    bandera3=true;
     if(valor3==1)
      digitalWrite(Led3, LOW);
    else
      digitalWrite(Led3, HIGH);
    lastButton3Time = currentTime;
  }
}
void ICACHE_RAM_ATTR button4Interrupt() {
  unsigned long currentTime = millis();
  if (currentTime - lastButton1Time > debounceDelay){
    bandera4=true;
     if(valor4==1)
      digitalWrite(Led4, LOW);
    else
      digitalWrite(Led4, HIGH);
    lastButton4Time = currentTime;
  }
}
void updateFromFirebase() {
  if (WiFi.status() == WL_CONNECTED) {
    Firebase.getInt(firebaseData, "/calefaccion");
    if (firebaseData.dataType() == "int") {
      valor1 = firebaseData.intData();
    }

    Firebase.getInt(firebaseData, "/riego");
    if (firebaseData.dataType() == "int") {
      valor2 = firebaseData.intData();
    }

    Firebase.getInt(firebaseData, "/ventilacion");
    if (firebaseData.dataType() == "int") {
      valor3 = firebaseData.intData();
    }

    Firebase.getInt(firebaseData, "/luces");
    if (firebaseData.dataType() == "int") {
      valor4 = firebaseData.intData();
    }
  }
}

void reles() {
  digitalWrite(Led1, valor1);
  digitalWrite(Led2, valor2);
  digitalWrite(Led3, valor3);
  digitalWrite(Led4, valor4);
}
/*
void sendDataToFirebaseDHT(float temperature, float humidity) {
  FirebaseJson json;
  json.set("temperature", String(temperature));
  json.set("humidity", String(humidity));
} 

void handleRoot() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  sendDataToFirebaseDHT(temperature, humidity);
    String jsonResponse = "{\"temperature\": " + String(temperature) + ", \"humidity\": " + String(humidity) + "}";
    server.send(200, "application/json", jsonResponse); 
}*/
int cont=0;
int cont2=0;

byte Check[8] = {
0b00000,
0b00001,
0b00011,
0b10110,
0b11100,
0b01000,
0b00000,
0b00000
};

byte Celcius[8] = {
0b10000,
0b00110,
0b01001,
0b01000,
0b01001,
0b00110,
0b00000,
0b00000
};

byte Equis[8] = {
0b00000,
0b10001,
0b01010,
0b00100,
0b01010,
0b10001,
0b00000,
0b00000
};




void setup() {
  WiFiManager wifiManager;
  bool connected = wifiManager.autoConnect("PROYECTO WIFI");

  // Si aún no tienes usuario y contraseña guardados en WiFiManager
  if (!wifiManager.autoConnect("PROYECTO WIFI")) {
    lcd.begin();
    lcd.begin(16, 2);
    lcd.setBacklight(1);
    lcd.print("Conéctese a una");
    lcd.setCursor(0, 1);
    lcd.print("Red de wifi");
    bool connected = WiFi.status() == WL_CONNECTED;
  }
  
  pinMode(Button1, INPUT);
  pinMode(Button2, INPUT);
  pinMode(Button3, INPUT);
  pinMode(Button4, INPUT);

  pinMode(DHTPIN, INPUT);

  pinMode(Led1, OUTPUT);
  pinMode(Led2, OUTPUT);
  pinMode(Led3, OUTPUT);
  pinMode(Led4, OUTPUT);

  attachInterrupt(digitalPinToInterrupt(Button1), button1Interrupt, FALLING);
  attachInterrupt(digitalPinToInterrupt(Button2), button2Interrupt, FALLING);
  attachInterrupt(digitalPinToInterrupt(Button3), button3Interrupt, FALLING);
  attachInterrupt(digitalPinToInterrupt(Button4), button4Interrupt, FALLING);

  lcd.begin();
  lcd.begin(16, 2);
  lcd.setBacklight(1);
  lcd.print("Conectese a una");
  lcd.setCursor(0, 1);
  lcd.print("Red de wifi");

  if (connected) {
    lcd.clear();
    lcd.print("Conectado a:");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.SSID());
    lcd.clear();
    delay(1500);

  } else {
    lcd.clear();
    lcd.print("Error en WiFi");
    delay(2000);
    ESP.restart();
  }
  //server.on("/", handleRoot);

 // server.begin();
  dht.begin();
  setupFirebase();
  delay(200);
  lcd.createChar(3, Check);
  lcd.createChar(2, Equis);
  lcd.createChar(1, Celcius);
  lcd.clear();
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  int t = dht.readTemperature();
  int h = dht.readHumidity();
  server.handleClient();

  lcd.setCursor(0,0);
  lcd.print("Temp:");
  lcd.print(t);
  lcd.write(byte(1));
  lcd.print(" Hum:");
  lcd.print(h);
  lcd.print("%");
  lcd.setCursor(0, 1);
  lcd.print("C:");
  lcd.setCursor(2, 1);
	lcd.write(byte(3));
  lcd.print(" R:");
  lcd.setCursor(6, 1);
	lcd.write(byte(2));
   lcd.print(" V:");
  lcd.setCursor(9, 1);
	lcd.write(byte(3));
  lcd.print(" L:");
  lcd.setCursor(12, 1);
	lcd.write(byte(2));

  if (WiFi.status() == WL_CONNECTED) {
    updateFromFirebase();
  }
    if(bandera1==true){
      valor1=!valor1;
      Firebase.setInt(firebaseData, "/calefaccion", valor1);
      bandera1=false;
    }
    if(bandera2==true){
      valor2=!valor2;
      Firebase.setInt(firebaseData, "/riego", valor2);
      bandera2=false;
    }
    if(bandera3==true){
      valor3=!valor3;
      Firebase.setInt(firebaseData, "/ventilacion", valor3);
      bandera3=false;
    }
    if(bandera4==true){
      valor4=!valor4;
      Firebase.setInt(firebaseData, "/luces", valor4);
      bandera4=false;
    }
    reles();
    if(cont2==5){
     Firebase.setString(firebaseData,"Sensores/Humedad", humidity);         
     Firebase.setString(firebaseData,"Sensores/Temperatura", temperature); 
     cont2=0;
    }

cont2++;

}

