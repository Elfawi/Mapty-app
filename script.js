'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  id = (Date.now() + Math.ceil(Math.random() * 10000) + '').slice(-10);
  distance;
  duration;
  coords;
  clicks = 0;
  date = new Date();
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }
  setDescription() {
    // prettier-ignore
    const months = ['January','February','March','April','May','June','July','August'
      ,'September','October','November','December',
    ];
    this.description = `${this.type.replace(
      this.type[0],
      this.type[0].toUpperCase()
    )} on ${months[this.date.getMonth()]} ${
      String(this.date.getDate())
      // .padStart(2,'0')
    }`;
  }
  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  cadence;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  elevationGain;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // per hour 😄
    return this.speed;
  }
}
///////////////////////////////////////////////////////////////////////
////////////////////// APPLICATION Architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // Get user postion
    this.#getPostion();

    // Get data from local storage
    this.#getWorkoutsFromLocalStorage();

    // Attatch event handelers
    form.addEventListener('submit', this.#newWorkout.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
  }

  #getPostion() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('please give us the access of your location');
        }
      );
  }
  #loadMap(postion) {
    const { latitude, longitude } = postion.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this));
    this.#workouts.forEach(work => this.#renderWorkoutMarker(work));
  }
  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    const checkInputValidation = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPostives = (...inputs) => inputs.every(input => input > 0);
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !checkInputValidation(distance, duration, cadence) ||
        !allPostives(distance, duration, cadence)
      )
        return alert('Inputs have to be postive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !checkInputValidation(distance, duration, elevation) ||
        !allPostives(distance, duration)
      )
        return alert('Inputs have to be postive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // push the workout into workouts array
    this.#workouts.push(workout);
    // render workout marker
    this.#renderWorkoutMarker(workout);
    // render workout
    this.#renderWorkout(workout);
    // hide form
    this.#hideForm();
    // save the workout into user browser
    this.#setWorkoutsToLocalStorage();
  }
  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          // content: 'Workout',
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  #hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  #renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === 'running') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  getWorkouts() {
    return this.#workouts;
  }
  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 1,
    });
    // workout.click();
  }
  #setWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  #getWorkoutsFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this.#renderWorkout(work));
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();

// const run1 = new Running([30, 7], 40, 70, 188);
// const cycling1 = new Cycling([20, 18], 30, 90, 522);
