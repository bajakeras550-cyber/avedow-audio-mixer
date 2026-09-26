/* =========================================================
   AVEDOW AUDIO MIXER
   Web Audio API
========================================================= */

let audioContext = null;
let audioElement = new Audio();

let sourceNode = null;
let masterGain = null;
let limiterNode = null;
let analyser = null;

let eqFilters = [];
let channels = [];

let powered = false;


/* =========================================================
   EQUALIZER
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

const eqContainer = document.getElementById("eq");

frequencies.forEach((frequency, index) => {

  const div = document.createElement("div");

  div.className = "eq-band";

  div.innerHTML = `
    <div class="eq-frequency">${frequency >= 1000 ? frequency / 1000 + "k" : frequency}</div>

    <input
      class="eq-slider"
      type="range"
      min="-12"
      max="12"
      step="0.5"
      value="0"
      data-index="${index}"
    >

    <div class="eq-value" id="eqValue${index}">
      0 dB
    </div>
  `;

  eqContainer.appendChild(div);

});


/* =========================================================
   AUDIO ENGINE
========================================================= */

function createAudioEngine() {

  if (audioContext) return;

  audioContext = new (
    window.AudioContext ||
    window.webkitAudioContext
  )();

  sourceNode =
    audioContext.createMediaElementSource(audioElement);

  masterGain =
    audioContext.createGain();

  analyser =
    audioContext.createAnalyser();

  analyser.fftSize = 256;

  limiterNode =
    audioContext.createDynamicsCompressor();

  limiterNode.threshold.value = -3;
  limiterNode.knee.value = 0;
  limiterNode.ratio.value = 20;
  limiterNode.attack.value = 0.003;
  limiterNode.release.value = 0.1;


  /* EQ */

  let previous = sourceNode;

  document.querySelectorAll(".eq-slider")
    .forEach((slider, index) => {

      const filter =
        audioContext.createBiquadFilter();

      filter.type =
        index === 0
          ? "lowshelf"
          : index === frequencies.length - 1
            ? "highshelf"
            : "peaking";

      filter.frequency.value =
        frequencies[index];

      filter.Q.value = 1;

      filter.gain.value = 0;

      previous.connect(filter);

      previous = filter;

      eqFilters.push(filter);

    });


  previous.connect(masterGain);

  masterGain.connect(limiterNode);

  limiterNode.connect(analyser);

  analyser.connect(audioContext.destination);


  masterGain.gain.value = 1;

  startMeter();
}


/* =========================================================
   POWER
========================================================= */

document.getElementById("powerBtn")
  .addEventListener("click", async () => {

    createAudioEngine();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    powered = !powered;

    document
      .getElementById("powerBtn")
      .classList.toggle("on", powered);

    if (!powered) {
      audioElement.pause();
    }

  });


/* =========================================================
   FILE PLAYER
========================================================= */

document.getElementById("fileInput")
  .addEventListener("change", event => {

    const file = event.target.files[0];

    if (!file) return;

    createAudioEngine();

    const url =
      URL.createObjectURL(file);

    audioElement.src = url;

    document.getElementById("fileName")
      .textContent = file.name;

  });


document.getElementById("playBtn")
  .addEventListener("click", async () => {

    createAudioEngine();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (!audioElement.src) {
      alert("Pilih file MP3/WAV terlebih dahulu.");
      return;
    }

    if (audioElement.paused) {
      await audioElement.play();
    } else {
      audioElement.pause();
    }

  });


document.getElementById("stopBtn")
  .addEventListener("click", () => {

    audioElement.pause();

    audioElement.currentTime = 0;

  });


/* =========================================================
   SEEK
========================================================= */

const seek =
  document.getElementById("seek");

audioElement.addEventListener("timeupdate", () => {

  if (!audioElement.duration) return;

  seek.value =
    (audioElement.currentTime /
      audioElement.duration) * 100;

  document.getElementById("time")
    .textContent =
      formatTime(audioElement.currentTime)
      + " / "
      + formatTime(audioElement.duration);

});


seek.addEventListener("input", () => {

  if (!audioElement.duration) return;

  audioElement.currentTime =
    (seek.value / 100) *
    audioElement.duration;

});


function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return String(minutes).padStart(2, "0")
    + ":"
    + String(secs).padStart(2, "0");

}


/* =========================================================
   EQ
========================================================= */

document.querySelectorAll(".eq-slider")
  .forEach(slider => {

    slider.addEventListener("input", () => {

      const index =
        Number(slider.dataset.index);

      const value =
        Number(slider.value);

      document.getElementById(
        "eqValue" + index
      ).textContent =
        value + " dB";

      if (eqFilters[index]) {
        eqFilters[index].gain.value = value;
      }

      document.getElementById("preset")
        .value = "custom";

    });

  });


/* =========================================================
   EQ PRESETS
========================================================= */

const presets = {

  flat: [
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
  ],

  bass: [
    6, 5, 4, 2, 0,
    0, -1, -2, -2, -2
  ],

  vocal: [
    -3, -2, -1, 2, 4,
    5, 4, 2, 0, -1
  ],

  dance: [
    5, 4, 2, -1, -2,
    0, 2, 4, 5, 4
  ],

  rock: [
    4, 3, 2, 0, -2,
    1, 3, 4, 3, 2
  ]

};


document.getElementById("preset")
  .addEventListener("change", event => {

    const preset =
      presets[event.target.value];

    if (!preset) return;

    preset.forEach((value, index) => {

      const slider =
        document.querySelector(
          `.eq-slider[data-index="${index}"]`
        );

      slider.value = value;

      document.getElementById(
        "eqValue" + index
      ).textContent =
        value + " dB";

      if (eqFilters[index]) {
        eqFilters[index].gain.value =
          value;
      }

    });

  });


/* =========================================================
   MASTER
========================================================= */

document.getElementById("masterVolume")
  .addEventListener("input", event => {

    const value =
      Number(event.target.value);

    if (masterGain) {
      masterGain.gain.value = value;
    }

    const db =
      value > 0
        ? 20 * Math.log10(value)
        : -Infinity;

    document.getElementById("masterDb")
      .textContent =
        Number.isFinite(db)
          ? db.toFixed(1) + " dB"
          : "-∞ dB";

  });


/* =========================================================
   DLMS
========================================================= */

document.getElementById("dlmsTarget")
  .addEventListener("input", event => {

    document.getElementById("dlmsTargetText")
      .textContent =
        event.target.value + " dB";

  });


document.getElementById("limiter")
  .addEventListener("change", event => {

    if (!limiterNode) return;

    if (event.target.checked) {

      limiterNode.threshold.value = -3;
      limiterNode.ratio.value = 20;

    } else {

      limiterNode.threshold.value = 0;
      limiterNode.ratio.value = 1;

    }

  });


/* =========================================================
   MIXER
========================================================= */

const mixer =
  document.getElementById("mixer");


for (let i = 0; i < 4; i++) {

  const channel = {

    volume: 1,
    pan: 0,
    mute: false,
    solo: false

  };

  channels.push(channel);


  const div =
    document.createElement("div");

  div.className = "channel";

  div.innerHTML = `

    <h3>CHANNEL ${i + 1}</h3>

    <div class="channel-meter">
      <div id="channelMeter${i}"></div>
    </div>

    <label>VOLUME</label>

    <input
      id="channelVolume${i}"
      type="range"
      min="0"
      max="1"
      step="0.01"
      value="1"
    >

    <div
      class="channel-label"
      id="channelVolumeText${i}"
    >
      100%
    </div>

    <label>PAN</label>

    <input
      id="channelPan${i}"
      type="range"
      min="-1"
      max="1"
      step="0.01"
      value="0"
    >

    <div
      class="channel-label"
      id="channelPanText${i}"
    >
      CENTER
    </div>

    <div class="channel-buttons">

      <button
        id="mute${i}"
        data-action="mute"
      >
        MUTE
      </button>

      <button
        id="solo${i}"
        data-action="solo"
      >
        SOLO
      </button>

    </div>

  `;

  mixer.appendChild(div);


  document
    .getElementById(`channelVolume${i}`)
    .addEventListener("input", event => {

      channel.volume =
        Number(event.target.value);

      document.getElementById(
        `channelVolumeText${i}`
      ).textContent =
        Math.round(channel.volume * 100)
        + "%";

    });


  document
    .getElementById(`channelPan${i}`)
    .addEventListener("input", event => {

      channel.pan =
        Number(event.target.value);

      let text = "CENTER";

      if (channel.pan < -0.05)
        text = "LEFT";

      if (channel.pan > 0.05)
        text = "RIGHT";

      document.getElementById(
        `channelPanText${i}`
      ).textContent = text;

    });


  document
    .getElementById(`mute${i}`)
    .addEventListener("click", () => {

      channel.mute =
        !channel.mute;

      document.getElementById(
        `mute${i}`
      ).classList.toggle(
        "active",
        channel.mute
      );

    });


  document
    .getElementById(`solo${i}`)
    .addEventListener("click", () => {

      channel.solo =
        !channel.solo;

      document.getElementById(
        `solo${i}`
      ).classList.toggle(
        "active",
        channel.solo
      );

    });

}


/* =========================================================
   VU METER
========================================================= */

function startMeter() {

  if (!analyser) return;

  const data =
    new Uint8Array(
      analyser.frequencyBinCount
    );


  function update() {

    analyser.getByteFrequencyData(data);

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }

    const rms =
      Math.sqrt(sum / data.length);

    const level =
      Math.min(100, rms / 255 * 180);

    document.getElementById(
      "masterMeter"
    ).style.width =
      level + "%";


    /* Fake channel meters */

    channels.forEach((channel, index) => {

      let channelLevel =
        level * channel.volume;

      if (channel.mute)
        channelLevel = 0;

      document.getElementById(
        `channelMeter${index}`
      ).style.width =
        channelLevel + "%";

    });


    requestAnimationFrame(update);

  }

  update();

}


/* =========================================================
   YOUTUBE
========================================================= */

document.getElementById("youtubeBtn")
  .addEventListener("click", () => {

    const url =
      document.getElementById("youtubeUrl")
        .value.trim();

    const videoId =
      getYouTubeID(url);

    if (!videoId) {

      alert("URL YouTube tidak dikenali.");

      return;

    }


    const container =
      document.getElementById(
        "youtubeContainer"
      );

    container.innerHTML = `

      <iframe
        src="https://www.youtube.com/embed/${videoId}"
        title="YouTube video player"
        allow="
          accelerometer;
          autoplay;
          clipboard-write;
          encrypted-media;
          gyroscope;
          picture-in-picture;
          web-share
        "
        allowfullscreen>
      </iframe>

    `;

  });


function getYouTubeID(url) {

  try {

    const parsed =
      new URL(url);

    if (
      parsed.hostname.includes("youtu.be")
    ) {

      return parsed.pathname
        .substring(1)
        .split("/")[0];

    }

    if (
      parsed.hostname.includes("youtube.com")
    ) {

      return parsed.searchParams.get("v");

    }

  } catch (error) {

    return null;

  }

  return null;

    }
