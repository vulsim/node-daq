#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include "user_interface.h"

#define WifiSSID            "itwlan"
#define WifiPassword        "*instinctools"
#define WifiMacAddress      { 0x5c, 0xcf, 0x7f, 0x93, 0x77, 0x11}
#define SerialBaudRate      9600
#define SerialPacketTimeout 5
#define SerialBufferSize    8192
#define TcpBridgePort       9876

WiFiServer server(TcpBridgePort);
WiFiClient client;

uint8_t buf1[SerialBufferSize];
uint8_t i1=0;

uint8_t buf2[SerialBufferSize];
uint8_t i2=0;

byte mac[6];

extern "C" void setup_macaddr(void) {
    
}

void setup() {
  delay(1000);  
  
  uint8_t mac[] = WifiMacAddress;
  const char *ssid = WifiSSID;
  const char *pw = WifiPassword;
  const int port = TcpBridgePort;

  wifi_set_macaddr(STATION_IF, &mac[0]);
    
  Serial.begin(SerialBaudRate);

  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pw);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
  }
  
  server.begin();  
  server.setNoDelay(true);
}

void loop() {

  if (!client || !client.connected()) {
    if (client) {
      client.stop();
    }
    client = server.available();
    return;
  }

  if (client.available()) {
    while(client.available()) {
      buf1[i1] = (uint8_t)client.read();
      
      if (i1 < SerialBufferSize - 1) {
        i1++;
      }
    }
    
    Serial.write(buf1, i1);
    i1 = 0;
  }

  if (Serial.available()) {
    while (1) {
      if (Serial.available()) {
        buf2[i2] = (char)Serial.read();
        if (i2 < SerialBufferSize - 1) {
          i2++;
        }
      } else {
        delay(SerialPacketTimeout);
        if (!Serial.available()) {
          break;
        }
      }
    }

    client.write((char*)buf2, i2);
    i2 = 0;
  }
}
