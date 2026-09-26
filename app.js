/* =========================================================
   AVEDOW AUDIO MIXER V3
   REAL 10 BAND EQ AUDIO ENGINE
========================================================= */

"use strict";

/* =========================================================
   GLOBAL
========================================================= */

let audioContext = null;
let audioElement = null;
let sourceNode = null;

let eqFilters = [];
let masterGain = null;
let limiterNode = null;
let analyser = null;

let powered = false;
let currentObjectURL = null;
let meterStarted = false;


/* =========================================================
   FREQUENCIES
========================================================= */

const frequencies = [
  31,
  62,
  125,
  250,
  500,
  1000,
  2000,
  4000,
  8000,
  16000
];


/* =========================================================
   PRESETS
========================================================= */

const presets = {

  flat: [
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
  ],

  bass: [
    8, 7, 6, 4, 2,
    0, -1, -2, -2, -2
  ],

  vocal: [
    -3, -2, -1, 1, 4,
    5, 4, 2, 0, -1
  ],

  dance: [
    7, 6, 4, 1, -2,
    0, 3, 5, 6, 4
  ],

  rock: [
    6, 5, 3, 0, -2,
    2, 4, 5, 4, 3
  ]

};


/* =========================================================
   DOM
========================================================= */

const powerBtn =
  document.getElementById("powerBtn");

const fileInput =
  document.getElementById("fileInput");

const fileName =
  document.getElementById("fileName");

const playBtn =
  document.getElementById("playBtn");

const stopBtn =
  document.getElementById("stopBtn");

const seek =
  document.getElementById("seek");

const timeDisplay =
  document.getElementById("time");

const eqContainer =
  document.getElementById("eq");

const presetSelect =
  document.getElementById("preset");

const masterVolume =
  document.getElementById("masterVolume");

const masterDb =
  document.getElementById("masterDb");

const masterMeter =
  document.getElementById("masterMeter");

const dlmsTarget =
  document.getElementById("dlmsTarget");

const dlmsTargetText =
  document.getElementById("dlmsTargetText");

const limiterCheckbox =
  document.getElementById("limiter");

const mixer =
  document.getElementById("mixer");


/* =========================================================
   CREATE AUDIO ELEMENT
========================================================= */

audioElement =
  document.createElement("audio");

audioElement.preload = "metadata";

audioElement.crossOrigin = "anonymous";


/* =========================================================
   CREATE EQ UI
========================================================= */

function createEQUI() {

  if (!eqContainer) return;

  eqContainer.innerHTML = "";

  frequencies.forEach(
    (frequency, index) => {

      const band =
        document.createElement("div");

      band.className = "eq-band";

      const label =
        frequency >= 1000
          ? (frequency / 1000) + "k"
          : frequency;

      band.innerHTML = `

        <div class="eq-frequency">
          ${label}
        </div>

        <input
          class="eq-slider"
          type="range"
          min="-12"
          max="12"
          step="0.5"
          value="0"
          data-index="${index}"
        >

        <div
          class="eq-value"
          id="eqValue${index}"
        >
          0 dB
        </div>

      `;

      eqContainer.appendChild(band);

    }
  );

}


/* =========================================================
   CREATE AUDIO ENGINE
========================================================= */

function initAudio() {

  if (audioContext) {

    return;

  }


  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;


  if (!AudioContextClass) {

    alert(
      "Browser ini tidak mendukung Web Audio API."
    );

    return;

  }


  audioContext =
    new AudioContextClass();


  /* =======================================================
     SOURCE
  ======================================================= */

  sourceNode =
    audioContext.createMediaElementSource(
      audioElement
    );


  /* =======================================================
     EQ CHAIN
  ======================================================= */

  let previous =
    sourceNode;


  eqFilters = [];


  frequencies.forEach(
    (frequency, index) => {

      const filter =
        audioContext.createBiquadFilter();


      if (index === 0) {

        filter.type =
          "lowshelf";

      }
      else if (
        index === frequencies.length - 1
      ) {

        filter.type =
          "highshelf";

      }
      else {

        filter.type =
          "peaking";

      }


      filter.frequency.value =
        frequency;


      filter.Q.value =
        1.0;


      filter.gain.value =
        0;


      previous.connect(
        filter
      );


      previous =
        filter;


      eqFilters.push(
        filter
      );

    }
  );


  /* =======================================================
     MASTER
  ======================================================= */

  masterGain =
    audioContext.createGain();


  masterGain.gain.value =
    Number(masterVolume.value);


  /* =======================================================
     LIMITER
  ======================================================= */

  limiterNode =
    audioContext.createDynamicsCompressor();


  limiterNode.threshold.value =
    -3;

  limiterNode.knee.value =
    0;

  limiterNode.ratio.value =
    20;

  limiterNode.attack.value =
    0.003;

  limiterNode.release.value =
    0.1;


  /* =======================================================
     ANALYSER
  ======================================================= */

  analyser =
    audioContext.createAnalyser();


  analyser.fftSize =
    512;


  analyser.smoothingTimeConstant =
    0.65;


  /* =======================================================
     FINAL AUDIO CHAIN
  ======================================================= */

  previous.connect(
    masterGain
  );


  masterGain.connect(
    limiterNode
  );


  limiterNode.connect(
    analyser
  );


  analyser.connect(
    audioContext.destination
  );


  console.log(
    "AVEDOW AUDIO ENGINE INITIALIZED"
  );


  startMeter();

}


/* =========================================================
   RESUME AUDIO CONTEXT
========================================================= */

async function resumeAudio() {

  initAudio();


  if (
    audioContext &&
    audioContext.state === "suspended"
  ) {

    await audioContext.resume();

  }

}


/* =========================================================
   POWER
========================================================= */

if (powerBtn) {

  powerBtn.addEventListener(
    "click",
    async () => {

      await resumeAudio();


      powered =
        !powered;


      powerBtn.classList.toggle(
        "on",
        powered
      );


      if (!powered) {

        audioElement.pause();

      }

    }
  );

}


/* =========================================================
   FILE INPUT
========================================================= */

if (fileInput) {

  fileInput.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files[0];


      if (!file) return;


      await resumeAudio();


      if (currentObjectURL) {

        URL.revokeObjectURL(
          currentObjectURL
        );

      }


      currentObjectURL =
        URL.createObjectURL(
          file
        );


      audioElement.pause();


      audioElement.src =
        currentObjectURL;


      audioElement.load();


      if (fileName) {

        fileName.textContent =
          file.name;

      }


      console.log(
        "Loaded audio:",
        file.name
      );

    }
  );

}


/* =========================================================
   PLAY
========================================================= */

if (playBtn) {

  playBtn.addEventListener(
    "click",
    async () => {

      await resumeAudio();


      if (!audioElement.src) {

        alert(
          "Pilih file MP3 atau WAV terlebih dahulu."
        );

        return;

      }


      if (!powered) {

        powered = true;

        if (powerBtn) {

          powerBtn.classList.add(
            "on"
          );

        }

      }


      try {

        if (audioElement.paused) {

          await audioElement.play();

          playBtn.textContent =
            "❚❚";

        }
        else {

          audioElement.pause();

          playBtn.textContent =
            "▶";

        }

      }
      catch (error) {

        console.error(
          "Playback error:",
          error
        );

        alert(
          "Audio tidak dapat diputar. Coba pilih file MP3/WAV lagi."
        );

      }

    }
  );

}


/* =========================================================
   STOP
========================================================= */

if (stopBtn) {

  stopBtn.addEventListener(
    "click",
    () => {

      audioElement.pause();

      audioElement.currentTime =
        0;


      if (playBtn) {

        playBtn.textContent =
          "▶";

      }

    }
  );

}


/* =========================================================
   AUDIO EVENTS
========================================================= */

audioElement.addEventListener(
  "play",
  () => {

    if (playBtn) {

      playBtn.textContent =
        "❚❚";

    }

  }
);


audioElement.addEventListener(
  "pause",
  () => {

    if (playBtn) {

      playBtn.textContent =
        "▶";

    }

  }
);


audioElement.addEventListener(
  "ended",
  () => {

    if (playBtn) {

      playBtn.textContent =
        "▶";

    }

  }
);


/* =========================================================
   TIME / SEEK
========================================================= */

audioElement.addEventListener(
  "timeupdate",
  () => {

    if (
      !Number.isFinite(
        audioElement.duration
      )
    ) {

      return;

    }


    const percent =
      (
        audioElement.currentTime /
        audioElement.duration
      ) * 100;


    if (seek) {

      seek.value =
        percent;

    }


    if (timeDisplay) {

      timeDisplay.textContent =
        formatTime(
          audioElement.currentTime
        )
        +
        " / "
        +
        formatTime(
          audioElement.duration
        );

    }

  }
);


if (seek) {

  seek.addEventListener(
    "input",
    () => {

      if (
        !Number.isFinite(
          audioElement.duration
        )
      ) {

        return;

      }


      audioElement.currentTime =
        (
          Number(seek.value) /
          100
        ) *
        audioElement.duration;

    }
  );

}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {

    return "00:00";

  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  const secs =
    Math.floor(
      seconds % 60
    );


  return (
    String(minutes)
      .padStart(2, "0")
    +
    ":"
    +
    String(secs)
      .padStart(2, "0")
  );

}


/* =========================================================
   EQ CONTROL
========================================================= */

function setEQBand(
  index,
  value
) {

  if (!eqFilters[index]) {

    return;

  }


  const gain =
    Number(value);


  const now =
    audioContext.currentTime;


  eqFilters[index].gain.cancelScheduledValues(
    now
  );


  eqFilters[index].gain.setTargetAtTime(
    gain,
    now,
    0.01
  );


  const slider =
    document.querySelector(
      `.eq-slider[data-index="${index}"]`
    );


  const valueText =
    document.getElementById(
      `eqValue${index}`
    );


  if (slider) {

    slider.value =
      gain;

  }


  if (valueText) {

    valueText.textContent =
      gain + " dB";

  }

}


/* =========================================================
   EQ SLIDERS
========================================================= */

function setupEQControls() {

  document
    .querySelectorAll(".eq-slider")
    .forEach(
      slider => {

        slider.addEventListener(
          "input",
          async () => {

            await resumeAudio();


            const index =
              Number(
                slider.dataset.index
              );


            const value =
              Number(
                slider.value
              );


            setEQBand(
              index,
              value
            );


            if (presetSelect) {

              presetSelect.value =
                "custom";

            }

          }
        );

      }
    );

}


/* =========================================================
   PRESETS
========================================================= */

if (presetSelect) {

  presetSelect.addEventListener(
    "change",
    async event => {

      const values =
        presets[
          event.target.value
        ];


      if (!values) {

        return;

      }


      await resumeAudio();


      values.forEach(
        (value, index) => {

          setEQBand(
            index,
            value
          );

        }
      );

    }
  );

}


/* =========================================================
   MASTER VOLUME
========================================================= */

if (masterVolume) {

  masterVolume.addEventListener(
    "input",
    async event => {

      await resumeAudio();


      const value =
        Number(
          event.target.value
        );


      if (masterGain) {

        masterGain.gain.setTargetAtTime(
          value,
          audioContext.currentTime,
          0.01
        );

      }


      const db =
        value > 0
          ? 20 * Math.log10(value)
          : -Infinity;


      if (masterDb) {

        masterDb.textContent =
          Number.isFinite(db)
            ? db.toFixed(1) + " dB"
            : "-∞ dB";

      }

    }
  );

}


/* =========================================================
   DLMS
========================================================= */

if (dlmsTarget) {

  dlmsTarget.addEventListener(
    "input",
    event => {

      if (dlmsTargetText) {

        dlmsTargetText.textContent =
          event.target.value +
          " dB";

      }

    }
  );

}


/* =========================================================
   LIMITER
========================================================= */

if (limiterCheckbox) {

  limiterCheckbox.addEventListener(
    "change",
    () => {

      if (!limiterNode) {

        return;

      }


      if (limiterCheckbox.checked) {

        limiterNode.threshold.value =
          -3;

        limiterNode.knee.value =
          0;

        limiterNode.ratio.value =
          20;

        limiterNode.attack.value =
          0.003;

        limiterNode.release.value =
          0.1;

      }
      else {

        limiterNode.threshold.value =
          0;

        limiterNode.knee.value =
          0;

        limiterNode.ratio.value =
          1;

      }

    }
  );

}


/* =========================================================
   MIXER
========================================================= */

const channels = [];


function createMixer() {

  if (!mixer) return;


  mixer.innerHTML = "";


  for (
    let index = 0;
    index < 4;
    index++
  ) {

    channels.push({

      volume: 1,
      pan: 0,
      mute: false,
      solo: false

    });


    const channel =
      document.createElement(
        "div"
      );


    channel.className =
      "channel";


    channel.innerHTML = `

      <h3>CHANNEL ${index + 1}</h3>

      <div class="channel-meter">
        <div id="channelMeter${index}"></div>
      </div>

      <label>VOLUME</label>

      <input
        id="channelVolume${index}"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value="1"
      >

      <div
        class="channel-label"
        id="channelVolumeText${index}"
      >
        100%
      </div>

      <label>PAN</label>

      <input
        id="channelPan${index}"
        type="range"
        min="-1"
        max="1"
        step="0.01"
        value="0"
      >

      <div
        class="channel-label"
        id="channelPanText${index}"
      >
        CENTER
      </div>

      <div class="channel-buttons">

        <button id="mute${index}">
          MUTE
        </button>

        <button id="solo${index}">
          SOLO
        </button>

      </div>

    `;


    mixer.appendChild(
      channel
    );


    const volume =
      document.getElementById(
        `channelVolume${index}`
      );


    const volumeText =
      document.getElementById(
        `channelVolumeText${index}`
      );


    const pan =
      document.getElementById(
        `channelPan${index}`
      );


    const panText =
      document.getElementById(
        `channelPanText${index}`
      );


    const mute =
      document.getElementById(
        `mute${index}`
      );


    const solo =
      document.getElementById(
        `solo${index}`
      );


    volume.addEventListener(
      "input",
      event => {

        channels[index].volume =
          Number(
            event.target.value
          );


        volumeText.textContent =
          Math.round(
            channels[index].volume * 100
          ) + "%";

      }
    );


    pan.addEventListener(
      "input",
      event => {

        channels[index].pan =
          Number(
            event.target.value
          );


        if (
          channels[index].pan < -0.05
        ) {

          panText.textContent =
            "LEFT";

        }
        else if (
          channels[index].pan > 0.05
        ) {

          panText.textContent =
            "RIGHT";

        }
        else {

          panText.textContent =
            "CENTER";

        }

      }
    );


    mute.addEventListener(
      "click",
      event => {

        channels[index].mute =
          !channels[index].mute;


        event.target.classList.toggle(
          "active",
          channels[index].mute
        );

      }
    );


    solo.addEventListener(
      "click",
      event => {

        channels[index].solo =
          !channels[index].solo;


        event.target.classList.toggle(
          "active",
          channels[index].solo
        );

      }
    );

  }

}


/* =========================================================
   VU METER
========================================================= */

function startMeter() {

  if (
    meterStarted ||
    !analyser
  ) {

    return;

  }


  meterStarted =
    true;


  const data =
    new Uint8Array(
      analyser.frequencyBinCount
    );


  function updateMeter() {

    if (!analyser) {

      requestAnimationFrame(
        updateMeter
      );

      return;

    }


    analyser.getByteTimeDomainData(
      data
    );


    let sum = 0;


    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const normalized =
        (
          data[i] - 128
        ) / 128;


      sum +=
        normalized *
        normalized;

    }


    const rms =
      Math.sqrt(
        sum / data.length
      );


    let level =
      rms * 100 * 3;


    level =
      Math.max(
        0,
        Math.min(
          100,
          level
        )
      );


    if (masterMeter) {

      masterMeter.style.width =
        level + "%";

    }


    channels.forEach(
      (channel, index) => {

        let channelLevel =
          level *
          channel.volume;


        if (channel.mute) {

          channelLevel =
            0;

        }


        const meter =
          document.getElementById(
            `channelMeter${
