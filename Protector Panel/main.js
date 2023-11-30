// Configuración de Firebase
var firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket:"",
  messagingSenderId: "",
  appId: ""
};

// Inicializar la app de Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();

setInterval(releTimer, 1000);
setInterval(lecturaVoltimetro, 1000);
setInterval(readTimerCheckboxValue, 1000);


let timerInterval; // Variable para almacenar el intervalo del temporizador


////////////////////////////////////////////////////////////////////////////
////                                                                    ////
////  Escuchar cambios en los relés y actualizar el estado en la página ////
////                                                                    ////
////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', function () {
  setupSwitch('panel');
  setupSwitch('bateria');
  setupSwitch('carga');
  setupSwitch('auxiliar');
});

function setupSwitch(relayType) {
  var storedState = localStorage.getItem(relayType + 'SwitchState');

  if (storedState !== null) {
    document.getElementById('switch' + capitalizeFirstLetter(relayType)).checked = storedState === 'ON';
    updateLedStatus(relayType, storedState);
  }

  firebase.database().ref(relayType).on("value", function(snapshot) {
    var relayState = snapshot.val();
    updateSwitchPosition(relayType, relayState === 1);
  });
}

function toggleRelay(relayType) {
  var switchState = document.getElementById('switch' + capitalizeFirstLetter(relayType)).checked;
  firebase.database().ref(relayType).set(switchState ? 1 : 0);
  localStorage.setItem(relayType + 'SwitchState', switchState ? 'ON' : 'OFF');
  updateLedStatus(relayType, switchState ? 'ON' : 'OFF');
  updateCircleStatus(relayType, switchState);
}

// Nueva función para actualizar el estado del círculo
function updateCircleStatus(relayType, switchState) {
  const circuloEstado = document.getElementById('circuloEstado' + capitalizeFirstLetter(relayType));
  circuloEstado.classList.remove('green', 'red');
  circuloEstado.classList.add(switchState ? 'green' : 'red');
}

function updateSwitchPosition(relayType, isSwitchOn) {
  document.getElementById('switch' + capitalizeFirstLetter(relayType)).checked = isSwitchOn;
  updateLedStatus(relayType, isSwitchOn ? 'ON' : 'OFF');
  updateCircleStatus(relayType, isSwitchOn);
}

function updateLedStatus(relayType, switchState) {
  var estadoElement = document.getElementById('estado' + capitalizeFirstLetter(relayType));
  var ledElement = document.getElementById('led' + capitalizeFirstLetter(relayType));
  ledElement.innerText = switchState;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                               TIMER                                  ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////
// Funcion para grabar los tiempos de activacion y desactivacion
function saveSchedule() {
    var timeOn = document.getElementById('timeOn').value; // Obtiene la hora y minutos de encendido
    var timeOff = document.getElementById('timeOff').value; // Obtiene la hora y minutos de apagado

    // Split de la cadena para obtener la hora y minutos por separado
    var hourOn = parseInt(timeOn.split(':')[0]);
    var minuteOn = parseInt(timeOn.split(':')[1]);
    var hourOff = parseInt(timeOff.split(':')[0]);
    var minuteOff = parseInt(timeOff.split(':')[1]);

    // Guardar la programación horaria en Firebase
    firebase.database().ref('schedule').set({
      hourOn: hourOn,
      minuteOn: minuteOn,
      hourOff: hourOff,
      minuteOff: minuteOff
    });
    document.getElementById("valorGuardado").textContent ="Tiempo guardado!";
  }

function releTimer() {
  firebase.database().ref('inputs/timerCheckbox').once('value').then(function(snapshot) {
    var timerCheckbox = snapshot.val();
    if (timerCheckbox) {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();

      // Leer la programación horaria desde Firebase
      firebase.database().ref('schedule').once('value').then(function(snapshot) {
        const schedule = snapshot.val();
        const hourOn = schedule.hourOn;
        const minuteOn = schedule.minuteOn;
        const hourOff = schedule.hourOff;
        const minuteOff = schedule.minuteOff;

        // Comprobar si es hora de encender o apagar las luces
        if (
          (currentHour > hourOn || (currentHour === hourOn && currentMinute >= minuteOn)) &&
          (currentHour < hourOff || (currentHour === hourOff && currentMinute < minuteOff))
        ) {
          firebase.database().ref('auxiliar').set(1);
        } else {
          firebase.database().ref('auxiliar').set(0);
        }
      });
    } else {
      // Si el temporizador está desactivado, detener el intervalo
      clearInterval(timerInterval);
    }
  });
}

// Iniciar el intervalo para releTimer


// Cambio de estado para cargar en firebase
function cambiarEstadoRelay(path, state) {
  firebase.database().ref(path).set(state);
}

function toggleRelay(path) {
  firebase.database().ref('inputs/timerCheckbox').once("value").then(function(snapshot) {
    var timerActive = snapshot.val();

    // Verificar si es el dispositivo de las luces y si el temporizador está activo
    if (path === 'auxiliar' && timerActive) {
       setInterval(releTimer, 1000);
    } else {
      // Si el temporizador no está 
      firebase.database().ref(path).once("value").then(function(snapshot) {
        var currentState = snapshot.val();
        var newState = currentState === 1 ? 0 : 1;
        cambiarEstadoRelay(path, newState);
      });
    }
  });
}
// Funcion para cambiar de estado si esta cliqueado
function toggleTimer(isChecked) {
  firebase.database().ref("inputs/timerCheckbox").set(isChecked);
  if (isChecked) {
    // Si se activa el temporizador, inicia el intervalo
    timerInterval = setInterval(releTimer, 1000);
  } else {
    // Si se desactiva el temporizador, detén el intervalo y apaga las luces
    clearInterval(timerInterval);
    firebase.database().ref('auxiliar').set(0);
  }
}
// Función para obtener una cadena de dos dígitos con un cero a la izquierda si es necesario
function twoDigitString(num) {
  return num < 10 ? '0' + num : num.toString();
}
// Función para mostrar el tiempo de encendido y apagado actual en la interfaz
function displaySchedule() {
    firebase.database().ref('schedule').once('value').then(function (snapshot) {
        var schedule = snapshot.val();
        var timeOnDisplay = document.getElementById('timeOnDisplay');
        var timeOffDisplay = document.getElementById('timeOffDisplay');
        
        // Formatear la cadena con el tiempo de encendido y apagado actual
        var timeOnString = twoDigitString(schedule.hourOn) + ':' + twoDigitString(schedule.minuteOn);
        var timeOffString = twoDigitString(schedule.hourOff) + ':' + twoDigitString(schedule.minuteOff);
        
        timeOnDisplay.innerText = timeOnString;
        timeOffDisplay.innerText = timeOffString;
    });
}

var timerCheckbox = document.getElementById("timerCheckbox");
timerCheckbox.addEventListener("change", function () {
var isChecked = timerCheckbox.checked;
toggleTimer(isChecked); // Llama a la función toggleVoltimetro() con el nuevo valor
});

function readTimerCheckboxValue() {
var timerCheckboxRef = database.ref("inputs/timerCheckbox");
timerCheckboxRef.on("value", function(snapshot) {
  var isChecked = snapshot.val();
  var timerCheckbox = document.getElementById("timerCheckbox");
  timerCheckbox.checked = isChecked;
});

}


// Call the function to read the initial value
readTimerCheckboxValue();


////////////////----- input check temporizador y termostato--------////////////////////
// Función para activar el temporizador
function setTimer() {
const activationHour = parseInt(document.getElementById("activationHourInput").value);
const activationMinute = parseInt(document.getElementById("activationMinuteInput").value);
const deactivationHour = parseInt(document.getElementById("deactivationHourInput").value);
const deactivationMinute = parseInt(document.getElementById("deactivationMinuteInput").value);

// Aquí puedes validar que los valores de hora y minuto sean válidos (entre 0 y 23 para la hora, y 0 y 59 para el minuto).

// Guarda el temporizador en Firebase
database.ref('temporizador').set({
    activacion: {
        hora: activationHour,
        minuto: activationMinute
    },
    desactivacion: {
        hora: deactivationHour,
        minuto: deactivationMinute
    },
    activo: true
});
}
// Función para desactivar el temporizador
function disableTimer() {
// Desactiva el temporizador en Firebase
database.ref('temporizador').update({
    activo: false
});
}
// Observar cambios en el tiempo de encendido y apagado y actualizar la interfaz
firebase.database().ref('schedule').on('value', function (snapshot) {
  displaySchedule();
});

// Llamamos a la función displaySchedule() al cargar la página para mostrar el tiempo de encendido y apagado actual
displaySchedule();




// Escuchar cambios en el estado del checkbox de temporizador
timerCheckbox.addEventListener('change', function() {
  // Actualizar el estado del switch de auxiliar en función del estado del checkbox de temporizador
  switchAuxiliar.disabled = timerCheckbox.checked;

  // Si el checkbox de temporizador está marcado, desmarcar el switch de auxiliar y actualizar Firebase
  if (timerCheckbox.checked) {
    switchAuxiliar.checked = false;
    toggleRelay('auxiliar');
  }
});

// Escuchar cambios en el estado del switch de auxiliar
switchAuxiliar.addEventListener('change', function() {
  // Si el checkbox de temporizador está marcado, desmarcar el switch de auxiliar y actualizar Firebase
  if (timerCheckbox.checked) {
    switchAuxiliar.checked = false;
    toggleRelay('auxiliar');
  }
});



//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                             VOLTIMETRO                               ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////
// Function para actualizar el valor máximo y mínimo de voltaje en Firebase


function saveVoltimetroRange() {
  // Obtener valores de los campos de entrada
  var maxVoltage = parseFloat(document.getElementById('maxVoltimetoInput').value);
  var minVoltage = parseFloat(document.getElementById('minVoltimetoInput').value);
  var cantidadDeMuestrasInput = parseFloat(document.getElementById('cantidadDeMuestrasInput').value);
  var deltaDescarga = parseFloat(document.getElementById('deltaDescargaInput').value);


  // Guardar lo obtenido y enviarlo a Firebase
  firebase.database().ref().update({
    cantidadDeMuestras: cantidadDeMuestrasInput,
    voltageRange: {
      maxVoltage: maxVoltage,
      minVoltage: minVoltage
    },
    delta: deltaDescarga  // Agregar el valor de "delta"
  });

  // Actualizar el valor mostrado en el HTML
  document.getElementById('valorGuardado').innerText = 'Valores guardados correctamente.';

  // Recuperar la cantidad de muestras desde Firebase y mostrarla en el HTML (agregar según sea necesario)
}



// valores guardados de la funcion saveVoltimetroRange()
database.ref('voltageRange').on('value', function(snapshot) {
  var data = snapshot.val();
  document.getElementById('maxVoltimetoDisplay').innerText = data.maxVoltage;
  document.getElementById('minVoltimetoDisplay').innerText = data.minVoltage;
});


//lectura del valor de tension.
function lecturaVoltimetro() {
  var datoFirebaseRef = firebase.database().ref("Voltaje"); 
  // Escucha cambios en el valor de Firebase
  datoFirebaseRef.on("value", function(snapshot) {
    var valor = snapshot.val(); // Obtiene el valor de Firebase
    var valorFirebaseElement = document.getElementById("valorDeCargaEnBateria");
    valorFirebaseElement.textContent = "Voltaje: " + valor.toFixed(2) + "V";
  });
}



// Obtener referencia al checkbox de voltaje
const voltajeCheckbox = document.getElementById('voltajeCheckbox');

// Escuchar cambios en el estado del checkbox de voltaje
voltajeCheckbox.addEventListener('change', function() {
  // Actualizar el estado del switch de batería en función del estado del checkbox de voltaje
  switchBateria.disabled = voltajeCheckbox.checked;

  // Enviar el estado del checkbox de voltaje a Firebase
  firebase.database().ref("inputs/voltajeCheckbox").set(voltajeCheckbox.checked);

  // Si el checkbox de voltaje está marcado, desmarcar el switch de batería y actualizar Firebase
  if (voltajeCheckbox.checked) {
    switchBateria.checked = false;
    toggleRelay('bateria');
  }
});

function readVoltajeCheckboxValue() {
  var voltajeCheckboxRef = firebase.database().ref("inputs/voltajeCheckbox");
  voltajeCheckboxRef.on("value", function(snapshot) {
    var isChecked = snapshot.val();
    var voltajeCheckbox = document.getElementById("voltajeCheckbox");
    voltajeCheckbox.checked = isChecked;
  });
}

// Llamar a la función para leer el valor inicial
readVoltajeCheckboxValue();
//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                         Nivel de señal                               ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////
function actualizarRSSI() {
  firebase.database().ref('potencia').once("value").then(function(snapshot) {
    var potencia = snapshot.val();
    document.getElementById('rssiValue').innerText = `Señal: ${potencia} dBm`;
  });
}

// Llamar a la función inicialmente
actualizarRSSI();

// Actualizar cada 5 segundos
setInterval(actualizarRSSI, 9000);



//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                         Sampleo                                      ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////
function muestreo(){
  firebase.database().ref('cantidadDeMuestras').once('value').then(function(snapshot) {
    var cantidadRecibida = snapshot.val();
    document.getElementById('cantidadDeMuestrasMostrado').innerText = cantidadRecibida;
  });
}
// Llamar a la función inicialmente
muestreo();
setInterval(muestreo, 1000);

/* Función para actualizar el intervalo de muestreo basado en cantidadRecibida
function actualizarIntervaloMuestreo(cantidadRecibida) {
  // Calcula el intervalo basado en cantidadRecibida (ajusta el multiplicador según sea necesario)
  var intervalo = cantidadRecibida * 1000;

  // Borra el intervalo existente y establece uno nuevo
  clearInterval(intervaloMuestreo);
  intervaloMuestreo = setInterval(lecturaVoltimetro, intervalo);
}

// Función para manejar cambios en cantidadDeMuestras
function manejarCambioCantidadDeMuestras() {
  firebase.database().ref('cantidadDeMuestras').once('value').then(function(snapshot) {
    var cantidadRecibida = snapshot.val();
    document.getElementById('cantidadDeMuestrasMostrado').innerText = cantidadRecibida;

    // Actualiza el intervalo de muestreo basado en el nuevo valor
    actualizarIntervaloMuestreo(cantidadRecibida);
  });
}

// Llama a la función inicialmente
manejarCambioCantidadDeMuestras();

// Configura un intervalo para verificar cambios en cantidadDeMuestras
var intervaloMuestreo = setInterval(manejarCambioCantidadDeMuestras, 100);*/

//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                         muestro valor delta                          ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////

function muestroValorDelta(){
  firebase.database().ref('delta').once('value').then(function(snapshot) {
    var cantidadRecibida = snapshot.val();
    document.getElementById('deltaDescargaInput').innerText = cantidadRecibida;
  });
}
// Llamar a la función inicialmente
muestroValorDelta();
setInterval(muestroValorDelta, 1000);

//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                         Envio de notificaciones                      ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////
function registerUser() {
  var email = document.getElementById('email').value;
  var password = document.getElementById('password').value;

  // Guardar en Firebase (base de datos)
  firebase.database().ref('usuarios/').push({
    email: email,
    password: password
  }).then(function () {
    console.log('Usuario registrado correctamente en Firebase.');
    // Aquí puedes realizar acciones adicionales, como enviar notificaciones
  }).catch(function (error) {
    console.error('Error al registrar usuario en Firebase:', error.message);
  });
}

// Que pueda editar el email y clave. 
// que indique al usuario hora de corte


//////////////////////////////////////////////////////////////////////////////
////                                                                      ////
////                                                                      ////
////                 Analisis de comportamiento de bateria                ////
////                                                                      ////
//////////////////////////////////////////////////////////////////////////////

//Analisis de baja de bateria:

// Delta de corte editado por usuario. ( entre 1 y 2v )
// Tiempo editable (en el orden de segundos)
// nviar el delta a firebase y consultarlo en arduino ( cambiar codigo para que cumpla con consigna.)

