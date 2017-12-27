const select$ = function (...args) {
  let str = arguments[0];
  if (str[0] === '#') {
    args[0] = args[0].replace('#', '');
    return document.getElementById(...args);
  }
  else {
    return document.querySelector(...args);
  }
}

const selectAll$ = function (...args) {
  return document.querySelectorAll(...args);
}

const px = function (num) {
  return num.toString() + "px";
}

const pc = function (num) {
  return num.toString() + "%";
}

const em = function (num) {
  return num.toString() + 'em';
}

const klass = function ($el, klass) {
  if (klass instanceof Array) {
    klass.forEach($el.classList.add);
  }
  else if (typeof klass === 'string')  {
    $el.classList.add(klass);
  }
}

const style = function ($el, styles) {
  for (let key in styles) {
    $el.style[key] = styles[key].toString();
  }
}

const attr = function ($el, attrs) {
  let setBoolAttr = function (attr) {
    if (attr[0] === '!') {
      $el.setAttribute(attr.replace('!', ''), false);
    }
    else {
      $el.setAttribute(attr, true);
    }
  }

  if (attrs instanceof Array) {
    attrs.forEach(setBoolAttr);
  }
  else if (typeof attrs === 'object') {
    for (let key in attrs) {
      if (key === 'style') {
        style($el, attrs[key]);
      }
      else {
        if (attrs[key] == null) {
          $el.removeAttribute(key);
        }
        else {
          $el.setAttribute(key, attrs[key]);
        }
      }
    }
  }
  else if (typeof attrs === 'string') {
    setBoolAttr(attrs);
  }
}

const text = function ($el, text) {
  $el.textContent = text.toString();
}

const edit = function ($el) {
  let funcs = {
    klass: (_klass) => {
      klass($el, _klass);
      return funcs;
    },
    style: (_styles) => {
      style($el, _styles);
      return funcs;
    },
    attr: (_attrs) => {
      attr($el, _attrs);
      return funcs;
    },
    text: (_text) => {
      text($el, _text);
      return funcs;
    }
  };
  return funcs;
}

const create = function (tag, attrs) {
  let $el = document.createElement(tag);
  attr($el, attrs);
  return $el;
}

const draw = function ($el, $target) {
  if ($el instanceof Array) {
    return $el.map($target.appendChild);
  }
  else {
    return $target.appendChild($el);
  }
}

const keystroke = function (ev) {
  let keyStr = '';
  if (ev.ctrlKey) {
    keyStr += 'ctrl+';
  }
  if (ev.altKey) {
    keyStr += 'alt+';
  }
  if (ev.shiftKey) {
    keyStr += 'shift+';
  }
  keyStr += ev.key.toLowerCase();

  return keyStr;
}

const assert = function (test) {
  if (!test) {
    throw new Error();
  }
}