let canMove = true;

function initEvent() {
  document.getElementsByTagName('div')[0].innerHTML = document.getElementsByTagName('div')[0].innerHTML;
}

function each() {
  initEvent();
  // when close button clicked
  document.querySelectorAll('div > span > p:last-child').forEach((element, index) => {
    element.addEventListener('click', () => {
      canMove = false;
      node.removeTab(index).then(() => {
        canMove = true;
      });
      initEvent();
      each();
    });
  });
  document.querySelectorAll('div > span').forEach((element, index) => {
    // when tab-bar clicked
    element.addEventListener('click', () => {
      if (!canMove) return;
      node.tabSwitch(index);
    });
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      node.popupTabMenu([
        e.clientX,
        e.clientY
      ]);
    });
    // move tab
    element.addEventListener('dragend', (e) => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
      });
      const pointerX = e.target.getBoundingClientRect().x + e.offsetX + 5;
      const y = document.body.classList.contains('thin') ? 15 : 40;
      const el = () => {
        try {
          return document.elementFromPoint(pointerX, y) === document.getElementsByTagName('div')[0] ?
            document.elementFromPoint(pointerX + 30, y).parentElement :
            document.elementFromPoint(pointerX, y).parentElement;
        } catch (e) {
          console.log('エラーは無視してください');
          return document.elementFromPoint(pointerX, y).parentElement;
        }
      };
      let direction;
      const els = document.getElementsByTagName('span');
      const target = [].slice.call(els).indexOf(e.target) - 1;
      const destination = [].slice.call(els).indexOf(el());
      const value = (
        pointerX - el().getBoundingClientRect().left
      ) / (
        el().getBoundingClientRect().right - el().getBoundingClientRect().left
      );
      if (
        value > 0.5 &&
        target < destination
      ) {
        direction = 1;
      } else if (target + 1 === destination) {
        direction = -destination + target;
      } else {
        direction = 0;
      }

      document.getElementsByTagName('div')[0].insertBefore(
        e.target,
        els[destination + direction]
      );
      node.tabMove(
        target,
        destination + direction
      );
      each();
    });
  });
}
each();

document.getElementById('textbox').addEventListener('input', () => {
  node.suggest(document.getElementById('textbox').value);
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  node.popupMenu();
});

function updateTextColor () {
  window.node.setTextColor(getComputedStyle(document.documentElement).getPropertyValue('--text-color'));
}