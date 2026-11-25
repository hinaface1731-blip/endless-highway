import { radioStations } from '../config/radio';

export function mountRadio() {
  const indicator = document.querySelector<HTMLButtonElement>('[data-ui="radio"]')!;
  const stations = document.querySelector<HTMLSelectElement>('#radio-station')!;
  const play = document.querySelector<HTMLButtonElement>('#radio-play')!;
  const status = document.querySelector<HTMLElement>('#radio-status')!;
  const volume = document.querySelector<HTMLInputElement>('#radio-volume')!;
  const lifetime = new AbortController();
  const { signal } = lifetime;
  let active: HTMLAudioElement | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  stations.replaceChildren(...radioStations.map(({ name, country }) => new Option(name + ' · ' + country)));

  function stop(message = 'Радио выключено') {
    clearTimeout(timeout);
    if (active) {
      active.pause();
      active.removeAttribute('src');
      active.load();
      active = undefined;
    }
    play.textContent = 'Слушать';
    status.textContent = message;
    indicator.classList.remove('is-on');
  }

  function start() {
    const station = radioStations[stations.selectedIndex];
    if (!station) return;
    stop();
    const stream = new Audio(station.url);
    active = stream;
    stream.volume = Number(volume.value) / 100;
    play.textContent = 'Выключить';
    const unavailable = () => {
      if (active === stream) stop('Станция недоступна. Выберите другую или повторите попытку.');
    };
    const buffering = (message: string) => {
      if (active !== stream) return;
      status.textContent = message;
      clearTimeout(timeout);
      timeout = setTimeout(unavailable, 12000);
    };
    buffering('Подключение…');
    stream.addEventListener('playing', () => {
      if (active !== stream) return;
      clearTimeout(timeout);
      status.textContent = 'В эфире';
      indicator.classList.add('is-on');
    });
    stream.addEventListener('waiting', () => buffering('Буферизация…'));
    stream.addEventListener('error', unavailable);
    stream.addEventListener('ended', unavailable);
    void stream.play().catch(unavailable);
  }

  play.addEventListener('click', () => { if (active) stop(); else start(); }, { signal });
  stations.addEventListener('change', () => { if (active) start(); }, { signal });
  volume.addEventListener('input', () => { if (active) active.volume = Number(volume.value) / 100; }, { signal });

  return () => {
    lifetime.abort();
    stop();
  };
}
