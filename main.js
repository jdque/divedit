class Component {
  constructor(...propKeys) {
    this._propKeys = propKeys || [];
    this._state = {};
  }

  get props() {
    let props = {};
    for (let key of this._propKeys) {
      props[key] = this[key];
    }
    return props;
  }

  get state() {
    return this._state;
  }

  update(state) {
    for (let key in state) {
      this._state[key] = state[key];
    }
  }
}

class App extends Component {
  constructor(props) {
    super('instructions', 'editor');
    
    this.instructions = props.instructions;
    this.editor = props.editor;
  }
}

class Instructions extends Component {
  constructor(props) {
    super('$instructions');
    
    this.$instructions = props.$instructions;
  }
}

class Editor extends Component {
  constructor(props) {
    super('$editor');
    
    this.$editor = props.$editor;
    this.levelMap = {};
    this.rootLevel = this.makeRootLevel();
    this.firstLevel = this.makeChildLevel(this.rootLevel);

    this.rootLevel.write(this.firstLevel.props.$level);
    this.$editor.appendChild(this.rootLevel.props.$level);
    this.$editor.addEventListener('keydown', (ev) => this.onKeyDown(ev));
    this.firstLevel.focusStart();
  }

  makeRootLevel() {
    let level = new Level({
      $level: $Level({depth: -1}),
      depth: -1
    });
    this.levelMap[level.props.id] = {
      level: level,
      parent: null
    };
    $(level.props.$level).addClass('root');
    $(level.props.$handle).remove();
    $(level.props.$content).children().first().remove();
    return level;
  }

  makeChildLevel(parent) {
    let depth = parent.props.depth + 1;
    let level = new Level({
      $level: $Level({depth: depth}),
      depth: depth
    });
    this.levelMap[level.props.id] = {
      level: level,
      parent: parent
    };
    return level;
  }

  getParent(level) {
    if (!this.levelMap[level.props.id]) {
      return null;
    }
    return this.levelMap[level.props.id].parent;
  }

  getLevel(id) {
    if (!this.levelMap[id]) {
      return null;
    }
    return this.levelMap[id].level;
  }

  onKeyDown(ev) {
    let key = keystroke(ev);
    let $selRoot = window.getSelection().anchorNode;
    while (!$selRoot.parentNode.classList.contains('content')) {
      $selRoot = $selRoot.parentNode;
    }
    let level = this.getLevel($selRoot.parentNode.getAttribute('data-id'));
    if (!level) {
      return false;
    }

    if (
      key.is('tab')                && this.indent(level, $selRoot)          ||
      key.is('shift+tab')          && this.outdent(level, $selRoot)         ||
      key.is('shift+enter')        && this.splitHorz(level, $selRoot)       ||
      key.is('ctrl+shift+enter')   && this.splitVert(level, $selRoot)       ||
      key.is('backspace')          && this.erase(level, $selRoot)           ||
      key.is('arrowup')            && this.cursorUp(level, $selRoot)        ||
      key.is('arrowdown')          && this.cursorDown(level, $selRoot)      ||
      key.is('ctrl+alt+arrowup')   && this.moveUp(level, $selRoot)          ||
      key.is('ctrl+alt+arrowdown') && this.moveDown(level, $selRoot)        ||
      key.is('ctrl+h')             && this.evalHTML(level, $selRoot, true)  ||
      key.is('ctrl+shift+h')       && this.evalHTML(level, $selRoot, false) ||
      key.is('ctrl+j')             && this.evalJS(level, $selRoot, true)    ||
      key.is('ctrl+shift+j')       && this.evalJS(level, $selRoot, false)   ||
      key.is('ctrl+shift+k')       && this.pushJS(level, $selRoot)          ||
      key.is('ctrl+shift+o')       && this.sendJSONToJS(level, $selRoot)    ||
      key.is('ctrl+shift+p')       && this.sendJSONToHTML(level, $selRoot)  ||
      key.is('ctrl+shift+a')       && this.fetchURL(level, $selRoot)
    ) {
      ev.preventDefault();
      return true;
    }
  }

  indent(level, $selRoot) {
    let {$level, $content} = level.props;
    let $next = $selRoot.nextSibling;

    if ($selRoot.textContent.length === 0 && $selRoot === $content.lastChild && $content.children.length > 1) {
      $selRoot.remove();
    }

    if ($next && isLevelEl($next)) {
      this.getLevel($next.getAttribute('data-id')).focusStart();
    }
    else {
      let child = this.makeChildLevel(level);
      level.write(child.props.$level, $selRoot);
      child.focusStart();

    }
    return true;
  }

  outdent(level, $selRoot) {
    let {$level, $content} = level.props;
    let parent = this.getParent(level);
    if (!parent || parent === this.rootLevel) {
      return true;
    }

    if ($selRoot.textContent.length === 0 && $selRoot === $content.lastChild && $content.children.length > 1) {
      $selRoot.remove();
    }

    let $next = $level.nextSibling;
    if ($next && !isLevelEl($next)) {
      parent.focusTo($next);
    }
    else {
      parent.write($NewLine());
      parent.focusEnd();
    }
    return true;
  }

  splitHorz(level, $selRoot) {
    let {$level, $content} = level.props;
    let parent = this.getParent(level);

    if ($level.classList.contains('column')) { //TODO - abstract this out
      let $row = $('<div>').addClass('row');
      let firstColumn = null;
      for (let i = 0; i < $level.parentNode.querySelectorAll('.column').length; i++) {
        let column = this.makeChildLevel(parent);
        firstColumn = firstColumn || column;
        $(column.props.$level)
          .addClass('column')
          .css({'margin-left': '0px'});
        $row.append(column.props.$level);
      }
      $row.insertAfter($level.parentNode);

      Sortable.create($row.get(0), {
        animation: 150,
        handle: '.handle'
      });

      firstCol.focusStart();

      return true;
    }

    if ($selRoot.textContent.length === 0 && $selRoot === $content.lastChild && $content.children.length > 1) {
      $selRoot.remove();
    }

    let sibling = this.makeChildLevel(parent);
    parent.write(sibling.props.$level, level.props.$level);
    sibling.focusStart();

    parent.updateSortable();

    return true;
  }

  splitVert(level, $selRoot) {
    let {$level, $content} = level.props;
    let width = $level.style.width || '100%';
    let splitWidth = parseInt(width.replace('%', '')) / 2;

    if ($level.classList.contains('column')) {
      let next = this.makeChildLevel(this.getParent(level));
      $(next.props.$level)
        .addClass('column')
        .css({'margin-left': '0px'});

      $(next.props.$level).insertAfter($level);

      Sortable.create($level.parentNode, {
        animation: 150,
        handle: '.handle'
      });

      next.focusStart();
    }
    else {
      let left = this.makeChildLevel(level);
      $(left.props.$level)
        .addClass('column')
        .css({'margin-left': '0px'});

      let right = this.makeChildLevel(level);
      $(right.props.$level)
        .addClass('column')
        .css({'margin-left': '0px'});

      let $row = $('<div>')
        .addClass('row')
        .append(left.props.$level)
        .append(right.props.$level);

      left.props.$content.innerHTML = $selRoot.outerHTML;
      level.overwrite($row.get(0), $selRoot);

      $($content).append($NewLine());

      Sortable.create($row.get(0), {
        animation: 150,
        handle: '.handle'
      });

      right.focusStart();
    }

    return true;
  }

  erase(level, $selRoot) {
    let {$level, $content} = level.props;

    if ($content.childNodes.length === 1 && $selRoot.textContent.length <= 1) {
      level.clear()
      level.write($NewLine());
      level.focusStart();
      return true;
    }

    return false;
  }

  moveUp(level, $selRoot) {
    let {$level, $content} = level.props;
    let $prev = $level.previousSibling;
    if (!$prev) {
      return true;
    }
    $($level).insertBefore($prev)
    level.focusTo($selRoot);
    return true;
  }

  moveDown(level, $selRoot) {
    let {$level, $content} = level.props;
    let $next = $level.nextSibling;
    if (!$next) {
      return true;
    }
    $($level).insertAfter($next);
    level.focusTo($selRoot);
    return true;
  }

  cursorUp(level, $selRoot) {
    //TODO - add temp line above if selRoot is first el in content
    let {$level, $content} = level.props;
    let $prev = $level.previousSibling;
    if (isLevelEl($prev) && ($selRoot === $content.firstChild)) {
      let prev = this.getLevel($prev.getAttribute('data-id'));
      prev.focusEnd();
      return true;
    }
    return false;
  }

  cursorDown(level, $selRoot) {
    //TODO - add temp line below if selRoot is first el in content
    let {$level, $content} = level.props;
    let $next = $level.nextSibling;
    if (isLevelEl($next) && ($selRoot === $content.lastChild)) {
      let next = this.getLevel($next.getAttribute('data-id'));
      next.focusStart();
      return true;
    }
    return false;
  }

  evalJS(level, $selRoot, inline) {
    let {$level, $content} = level.props;

    let text =
      !window.getSelection().isCollapsed ?
        window.getSelection().toString() :
        inline ?
          $selRoot.textContent :
          $content.innerText;
    let evalText = this._evalJS(text, null);

    if (inline) {
      level.overwrite($(evalText).get(0), $selRoot);
      level.focusTo($selRoot);
    }
    else {
      level.clear();
      level.write($('<div>').html(evalText).get(0));
      level.focusEnd();
    }

    return true;
  }

  evalHTML(level, $selRoot, inline) {
    let {$level, $content} = level.props;

    let text =
      !window.getSelection().isCollapsed ?
        window.getSelection().toString() :
        inline ?
          $selRoot.textContent :
          $content.innerText;

    if (inline) {
      level.overwrite($(text).get(0), $selRoot);
      level.focusTo($selRoot);
    }
    else {
      level.clear();
      level.write($('<div>').html(text).get(0));
      level.focusEnd();
    }

    return true;
  }

  _evalJS(text, json) {
    json = json || {};

    let cancelled = false;
    let parts = [];
    let funcs = {
      data: json,
      cancel: function () {
        cancelled = true;
      },
      write: function (txt) {
        parts.push(txt);
      }
    };
    let [params, args] = [Object.keys(funcs), Object.values(funcs)];

    (new Function(params.join(','),
      `try {
        ${text};
      }
      catch (e) {
        cancel();
      }`
    )).apply(null, args);

    if (cancelled) {
      return null;
    }

    return parts.join('');
  }

  pushJS(level, $selRoot) {
    let {$level, $content} = level.props;

    this.splitHorz(level, $selRoot);
    let $nextLevel = $level.nextSibling;
    let nextLevel = this.getLevel($nextLevel.getAttribute('data-id'));

    let text = window.getSelection().isCollapsed ? $content.innerText : window.getSelection().toString();
    let evalText = this._evalJS(text, null);

    nextLevel.clear();
    nextLevel.write($('<div>').html(evalText).get(0));

    level.focusEnd();

    return true;
  }

  sendJSONToJS(level, $selRoot) {
    let {$level, $content} = level.props;

    let $nextLevel = $level.nextSibling;
    let nextLevel = this.getLevel($nextLevel.getAttribute('data-id'));

    let text = window.getSelection().isCollapsed ? $content.innerText : window.getSelection().toString();
    let jsonData = JSON.parse(text);
    let evalText = this._evalJS(nextLevel.props.$content.innerText, jsonData);

    this.splitHorz(nextLevel, $selRoot);

    $nextLevel = $nextLevel.nextSibling;
    nextLevel = this.getLevel($nextLevel.getAttribute('data-id'));

    nextLevel.clear();
    nextLevel.write($('<div>').html(evalText).get(0));

    level.focusEnd();

    return true;
  }

  sendJSONToHTML(level, $selRoot) {
    let {$level, $content} = level.props;

    let $nextLevel = $level.nextSibling;
    let nextLevel = this.getLevel($nextLevel.getAttribute('data-id'));

    let text = window.getSelection().isCollapsed ? $content.innerText : window.getSelection().toString();
    let jsonData = JSON.parse(text);
    let evalText = Hogan.compile(nextLevel.props.$content.innerText).render(jsonData);

    this.splitHorz(nextLevel, $selRoot);

    $nextLevel = $nextLevel.nextSibling;
    nextLevel = this.getLevel($nextLevel.getAttribute('data-id'));

    nextLevel.clear();
    nextLevel.write($('<div>').html(evalText).get(0));

    level.focusEnd();

    return true;
  }

  fetchURL(level, $selRoot) {
    let {$level, $content} = level.props;
    let text = window.getSelection().isCollapsed ? $content.innerText : window.getSelection().toString();

    fetch(text, {method: 'GET'})
      .then(res => {
        return res.text();
      })
      .then(text => {
        level.clear();
        level.write($('<div>').append($('<pre>').text(text).css({
          'margin': '0px',
          'word-wrap': 'break-word',
          'overflow-wrap': 'break-word',
          'white-space': 'normal'
        })).get(0));
      });

    return true;
  }
}

class Level extends Component {
  static nextId() {
    if (!Level._nextId) {
      Level._nextId = 0;
    }
    return Level._nextId++;
  }

  constructor(props) {
    super('id', 'depth', '$level', '$content', '$handle');
    
    this.id = Level.nextId();
    this.depth = props.depth;
    this.sortable = null;
    this.$level = props.$level;
    this.$content = this.$level.querySelector('.content');
    this.$handle = this.$level.querySelector('.handle');

    this.$level.setAttribute('data-id', this.id);
    this.$content.setAttribute('data-id', this.id);
    this.$handle.setAttribute('data-id', this.id);
  }

  write($el, $preceder) {
    if (!$preceder) {
      $preceder = this.$content.lastChild;
    }
    else if ($preceder.nodeType === Node.TEXT_NODE) {
      $preceder = $preceder.parentNode;
    }

    if ($preceder === this.$content.lastChild) {
      this.$content.appendChild($el);
    }
    else {
      this.$content.insertBefore($el, $preceder.nextSibling);
    }
  }

  overwrite($el, $target) {
    this.write($el, $target);
    if ($target) {
      $target.remove();
    }
  }

  clear() {
    while (this.$content.lastChild) {
      this.$content.lastChild.remove();
    }
  }

  updateSortable() {
    if (this.sortable) {
      this.sortable.destroy();
    }
    //Disable sortable for all content elements that are not contigous siblings with $sibling
    this.sortable = Sortable.create(this.$content, {
      animation: 150,
      handle: '.handle'
    });
  }

  _moveCursorTo($contentEditable) {
    if (!document.createRange) {
      return;
    }
    let range = document.createRange();
    range.selectNodeContents($contentEditable);
    range.collapse(false);
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  focusStart() {
    let $target = this.$content.firstChild;
    while (isLevelEl($target)) {
      $target = $target.querySelector('.content').firstChild;
    }
    this._moveCursorTo($target);
  }

  focusEnd() {
    let $target = this.$content.lastChild;
    while (isLevelEl($target)) {
      $target = $target.querySelector('.content').lastChild;
    }
    this._moveCursorTo($target);
  }

  focusTo($el) {
    this._moveCursorTo($el);
  }
}

function $NewLine() {
  return $('<div><br /></div>').get(0);
}

function $Level(props) {
  let $_level = $('<div>')
    .addClass('level')
    .attr({
      'contentEditable': false
    })
    .css({
      'margin-left': props.depth > 0 ? em(1) : 0,
      'z-index': props.depth + 1
    });

  let $_content = $('<div>')
    .addClass('content')
    .attr({
      'contentEditable': true,
      'spellcheck': false
    })
    .append('<div><br /></div>');

  let $_handle = $('<div>')
    .addClass('handle')
    .attr({
      'contentEditable': false
    })
    .css({
      'user-select': 'none'
    })
    .text('::');

  $_level.append($_content);
  $_level.append($_handle);

  return $_level.get(0);
}

function isLevelEl($el) {
  return $el && $el.nodeType === Node.ELEMENT_NODE && $el.classList.contains('level');
}

function init() {
  let instructions = new Instructions({
    $instructions: $('#instructions').get(0)
  });

  let editor = new Editor({
    $editor: $('#editor').get(0)
  });

  let app = new App({
    instructions: instructions,
    editor: editor
  });
}

window.onload = init;