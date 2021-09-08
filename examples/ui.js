window.el = (tagName, innerText, onClick) => {
  const el = document.createElement(tagName);
  el.innerText = innerText;
  onClick && el.addEventListener('click', onClick);
  document.body.appendChild(el);
};
