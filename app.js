"use strict";

// ==========================================
// AVEDOW AUDIO MIXER - APP.JS
// Stable EQ + Audio Player + YouTube
// ==========================================

let audioContext = null;
let audioElement = null;
let sourceNode = null;

let eqFilters = [];
let masterGain = null;
let limiterNode = null;
let analyser = null;

let audioObjectURL = null;
let isPowered = false;

// 10 BAND EQ
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

const presets = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  bass: [
    8,
    7,
    6,
    3,
    1,
    0,
    0,
    0,
    0,
    0
  ],

  vocal: [
    -2,
    -2,
    -1,
    1,
    4,
    6,
    5,
    3,
    1,
    0
  ],

  dance: [
    6,
    5,
    3,
    1,
    0,
    1,
    3,
    4,
    5,
    5
  ],

  rock: [
    5,
    4,
    2,
    -1,
    -2,
    1,
    3,
    4,
    5,
    4
  ]
};


// ==========================================
// GET ELEMENTS
// ==========================================

const powerBtn =
  document.getElementById("powerBtn");

const masterVolume =
  document.getElementById("masterVolume");

const masterMeter =
  document.getElementById("masterMeter");

const dlmsTarget =
  document.getElementById("dlmsTarget");

const dlmsTargetText =
  document.getElementById("dlmsTargetText");

const limiter =
  document.getElementById("limiter");

const preset =
  document.getElementById("preset");

const eqContainer =
  document.getElementById("eq");

const mixerContainer =
  document.getElementById("mixer");

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

const youtubeUrl =
  document.getElementById("youtubeUrl");

const youtubeBtn =
  document.getElementById("youtubeBtn");

const youtubeContainer =
  document.getElementById("youtubeContainer");


// ==========================================
// CREATE AUDIO ELEMENT
// ==========================================

audioElement =
  document.createElement("audio");

audioElement.preload = "metadata";
audioElement.crossOrigin = "anonymous";


// ==========================================
// FORMAT TIME
// ==========================================

function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const min =
    Math.floor(seconds / 60);

  const sec =
    Math.floor(seconds % 60);

  return (
    String(min).padStart(2, "0") +
    ":" +
    String(sec).padStart(2, "0")
  );
}


// ==========================================
// CREATE EQ UI
// ==========================================

function createEQ() {

  if (!eqContainer) {
    console.error("EQ container tidak ditemukan");
    return;
  }

  eqContainer.innerHTML = "";

  frequencies.forEach((freq, index) => {

    const band =
      document.createElement("div");

    band.className = "eq-band";

    const label =
      document.createElement("div");

    label.className = "eq-label";

    label.textContent =
      freq >= 1000
        ? `${freq / 1000}k`
        : `${freq}`;

    const slider =
      document.createElement("input");

    slider.type = "range";
    slider.min = "-12";
    slider.max = "12";
    slider.step = "0.5";
    slider.value = "0";

    slider.className = "eq-slider";

    slider.dataset.index = index;

    const value =
      document.createElement("div");

    value.className = "eq-value";

    value.textContent = "0 dB";

    slider.addEventListener(
      "input",
      () => {

        const gain =
          Number(slider.value);

        value.textContent =
          `${gain > 0 ? "+" : ""}${gain} dB`;

        setEQ(index, gain);
      }
    );

    band.appendChild(label);
    band.appendChild(slider);
    band.appendChild(value);

    eqContainer.appendChild(band);
  });
}


// ==========================================
// CREATE AUDIO ENGINE
// ==========================================

function createAudioEngine() {

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

  sourceNode =
    audioContext.createMediaElementSource(
      audioElement
    );

  eqFilters = [];

  // SOURCE
  let currentNode =
    sourceNode;

  // 10 BAND EQ
  frequencies.forEach(
    (frequency) => {

      const filter =
        audioContext.createBiquadFilter();

      filter.type =
        "peaking";

      filter.frequency.value =
        frequency;

      filter.Q.value =
        1.0;

      filter.gain.value =
        0;

      currentNode.connect(filter);

      currentNode =
        filter;

      eqFilters.push(filter);
    }
  );

  // MASTER
  masterGain =
    audioContext.createGain();

  masterGain.gain.value =
    1;

  currentNode.connect(
    masterGain
  );

  // LIMITER
  limiterNode =
    audioContext.createDynamicsCompressor();

  limiterNode.threshold.value =
    -1;

  limiterNode.knee.value =
    0;

  limiterNode.ratio.value =
    20;

  limiterNode.attack.value =
    0.003;

  limiterNode.release.value =
    0.1;

  masterGain.connect(
    limiterNode
  );

  // ANALYSER
  analyser =
    audioContext.createAnalyser();

  analyser.fftSize =
    256;

  limiterNode.connect(
    analyser
  );

  analyser.connect(
    audioContext.destination
  );

  console.log(
    "AVEDOW AUDIO ENGINE READY"
  );
}


// ==========================================
// RESUME AUDIO
// ==========================================

async function resumeAudio() {

  if (!audioContext) {
    createAudioEngine();
  }

  if (!audioContext) {
    return;
  }

  if (
    audioContext.state ===
    "suspended"
  ) {

    await audioContext.resume();
  }
}


// ==========================================
// POWER
// ==========================================

if (powerBtn) {

  powerBtn.addEventListener(
    "click",
    async () => {

      await resumeAudio();

      isPowered =
        !isPowered;

      if (isPowered) {

        powerBtn.classList.add(
          "active"
        );

        powerBtn.textContent =
          "POWER ON";

      } else {

        powerBtn.classList.remove(
          "active"
        );

        powerBtn.textContent =
          "POWER OFF";

        if (audioElement) {
          audioElement.pause();
        }
      }
    }
  );
}


// ==========================================
// FILE INPUT
// ==========================================

if (fileInput) {

  fileInput.addEventListener(
    "change",
    async (event) => {

      const file =
        event.target.files[0];

      if (!file) {
        return;
      }

      const validTypes = [
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mp4",
        "audio/ogg"
      ];

      if (
        !validTypes.includes(
          file.type
        ) &&
        !file.name.match(
          /\.(mp3|wav|ogg|m4a)$/i
        )
      ) {

        alert(
          "Pilih file MP3, WAV, OGG, atau M4A."
        );

        return;
      }

      await resumeAudio();

      if (audioObjectURL) {

        URL.revokeObjectURL(
          audioObjectURL
        );
      }

      audioObjectURL =
        URL.createObjectURL(file);

      audioElement.src =
        audioObjectURL;

      audioElement.load();

      if (fileName) {

        fileName.textContent =
          file.name;
      }

      if (seek) {
        seek.value = 0;
      }

      if (timeDisplay) {
        timeDisplay.textContent =
          "00:00 / 00:00";
      }

      console.log(
        "Audio loaded:",
        file.name
      );
    }
  );
}


// ==========================================
// PLAY
// ==========================================

if (playBtn) {

  playBtn.addEventListener(
    "click",
    async () => {

      if (!audioElement.src) {

        alert(
          "Masukkan file MP3/WAV terlebih dahulu."
        );

        return;
      }

      await resumeAudio();

      try {

        await audioElement.play();

        console.log(
          "PLAYING"
        );

      } catch (error) {

        console.error(
          "Play error:",
          error
        );

        alert(
          "Audio tidak bisa diputar. Tekan POWER dulu lalu PLAY."
        );
      }
    }
  );
}


// ==========================================
// STOP
// ==========================================

if (stopBtn) {

  stopBtn.addEventListener(
    "click",
    () => {

      audioElement.pause();

      audioElement.currentTime =
        0;

      if (seek) {
        seek.value = 0;
      }
    }
  );
}


// ==========================================
// AUDIO TIME
// ==========================================

audioElement.addEventListener(
  "timeupdate",
  () => {

    const current =
      audioElement.currentTime || 0;

    const duration =
      audioElement.duration || 0;

    if (seek && duration) {

      seek.value =
        (current / duration) * 100;
    }

    if (timeDisplay) {

      timeDisplay.textContent =
        `${formatTime(current)} / ${formatTime(duration)}`;
    }
  }
);


// ==========================================
// SEEK
// ==========================================

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

      const percentage =
        Number(seek.value) / 100;

      audioElement.currentTime =
        audioElement.duration *
        percentage;
    }
  );
}


// ==========================================
// SET EQ
// ==========================================

function setEQ(index, gain) {

  if (!eqFilters[index]) {
    return;
  }

  eqFilters[index].gain.value =
    gain;

  console.log(
    `EQ ${frequencies[index]} Hz = ${gain} dB`
  );
}


// ==========================================
// PRESET
// ==========================================

if (preset) {

  preset.addEventListener(
    "change",
    () => {

      const selected =
        preset.value;

      const values =
        presets[selected];

      if (!values) {
        return;
      }

      values.forEach(
        (gain, index) => {

          if (eqFilters[index]) {

            eqFilters[index].gain.value =
              gain;
          }

          const slider =
            eqContainer?.querySelector(
              `input[data-index="${index}"]`
            );

          if (slider) {
            slider.value =
              gain;
          }

          const valueElement =
            slider?.parentElement?.querySelector(
              ".eq-value"
            );

          if (valueElement) {

            valueElement.textContent =
              `${gain > 0 ? "+" : ""}${gain} dB`;
          }
        }
      );
    }
  );
}


// ==========================================
// MASTER VOLUME
// ==========================================

if (masterVolume) {

  masterVolume.addEventListener(
    "input",
    () => {

      const value =
        Number(masterVolume.value);

      if (masterGain) {

        masterGain.gain.value =
          value;
      }
    }
  );
}


// ==========================================
// DLMS TARGET
// ==========================================

if (dlmsTarget) {

  dlmsTarget.addEventListener(
    "input",
    () => {

      if (dlmsTargetText) {

        dlmsTargetText.textContent =
          `${dlmsTarget.value} dB`;
      }
    }
  );
}


// ==========================================
// LIMITER
// ==========================================

if (limiter) {

  limiter.addEventListener(
    "change",
    () => {

      if (!limiterNode) {
        return;
      }

      if (limiter.checked) {

        limiterNode.threshold.value =
          -1;

        limiterNode.ratio.value =
          20;

      } else {

        limiterNode.threshold.value =
          0;

        limiterNode.ratio.value =
          1;
      }
    }
  );
}


// ==========================================
// VU METER
// ==========================================

function updateMeter() {

  requestAnimationFrame(
    updateMeter
  );

  if (
    !analyser ||
    !masterMeter
  ) {
    return;
  }

  const data =
    new Uint8Array(
      analyser.fftSize
    );

  analyser.getByteTimeDomainData(
    data
  );

  let sum = 0;

  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const value =
      (data[i] - 128) / 128;

    sum +=
      value * value;
  }

  const rms =
    Math.sqrt(
      sum / data.length
    );

  const level =
    Math.min(
      100,
      rms * 400
    );

  masterMeter.style.width =
    `${level}%`;
}

updateMeter();


// ==========================================
// SIMPLE MIXER CHANNELS
// ==========================================

function createMixer() {

  if (!mixerContainer) {
    return;
  }

  const channels =
    mixerContainer.querySelectorAll(
      ".channel"
    );

  channels.forEach(
    (channel, index) => {

      const slider =
        channel.querySelector(
          'input[type="range"]'
        );

      const meter =
        channel.querySelector(
          ".meter"
        );

      if (slider) {

        slider.addEventListener(
          "input",
          () => {

            const value =
              Number(slider.value);

            if (meter) {

              meter.style.height =
                `${value}%`;
            }
          }
        );
      }
    }
  );
}


// ==========================================
// YOUTUBE
// ==========================================

function extractYouTubeID(url) {

  if (!url) {
    return null;
  }

  url =
    url.trim();

  let match =
    url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/
    );

  if (match) {
    return match[1];
  }

  // Kalau user hanya memasukkan ID video
  if (
    /^[a-zA-Z0-9_-]{11}$/.test(url)
  ) {
    return url;
  }

  return null;
}


function loadYouTube() {

  if (
    !youtubeUrl ||
    !youtubeContainer
  ) {
    return;
  }

  const url =
    youtubeUrl.value;

  const videoID =
    extractYouTubeID(url);

  if (!videoID) {

    alert(
      "Link YouTube tidak valid.\n\nContoh:\nhttps://www.youtube.com/watch?v=XXXXXXXXXXX"
    );

    return;
  }

  youtubeContainer.innerHTML = "";

  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.width = "100%";
  iframe.height = "315";

  iframe.src =
    `https://www.youtube.com/embed/${videoID}?rel=0`;

  iframe.title =
    "YouTube player";

  iframe.frameBorder = "0";

  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

  iframe.allowFullscreen =
    true;

  youtubeContainer.appendChild(
    iframe
  );

  console.log(
    "YouTube loaded:",
    videoID
  );
}


if (youtubeBtn) {

  youtubeBtn.addEventListener(
    "click",
    loadYouTube
  );
}


// ==========================================
// ENTER ON YOUTUBE INPUT
// ==========================================

if (youtubeUrl) {

  youtubeUrl.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        loadYouTube();
      }
    }
  );
}


// ==========================================
// CLEANUP
// ==========================================

window.addEventListener(
  "beforeunload",
  () => {

    if (audioObjectURL) {

      URL.revokeObjectURL(
        audioObjectURL
      );
    }

    if (audioContext) {

      audioContext.close();
    }
  }
);


// ==========================================
// START
// ==========================================

createEQ();
createMixer();

console.log(
  "AVEDOW AUDIO MIXER READY"
);
