const frame = () => document.getElementById('iframeEntity');
const frameTop = () => document.getElementById('iframe');
const PLATFORMS = ["darwin", "linux", "win32"];

// eslint-disable-next-line
function prev() {
  frameTop().className = '';
}

// eslint-disable-next-line
function move(page) {
  if (frameTop().className !== 'displaying') {
    frameTop().className = 'displaying';
    frame().src = `./${page}.html`;
  }
}

function toggleVisiblityByPlatform(platform) {
  const items = [];
  const hideItems = document.getElementsByClassName(`!${platform}`);
  const PLATFORMS_UNUSED_CURRENT = PLATFORMS.filter(n => n !== platform);

  for (let i = 0; i < PLATFORMS_UNUSED_CURRENT.length; i ++){
    let unusedPlatform = PLATFORMS_UNUSED_CURRENT[i];
    items.push(...document.querySelectorAll(`${unusedPlatform} :not(${platform})`));
  }

  for (let i = 0; i < items.length; i ++){
    let item = items[i];
    item.remove();
  }

  for (let i = 0; i < hideItems.length; i ++){
    let item = hideItems[i];
    item.remove();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  toggleVisiblityByPlatform(window.node.platform);
});