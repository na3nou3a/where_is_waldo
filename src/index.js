import { gameInfo } from './utils/gameInfo.js';

/*=============== SELECT HTML ===============*/
const gameBoard = document.querySelector('.gameboard');
const charactersContainer = document.querySelector('.hiddenCharacters');
const smModel = document.querySelector('.smallModel');
const heading1 = document.querySelector('.currentLevel');
const heading2 = document.querySelector('.completed');
const btns = document.querySelectorAll('.btn-group button');
/*=============== GAME LOGIC ===============*/
let currentLevel = {
  wichLevel: 'level1',
  levelImg: '',
  hiddenC: {},
};
let completedLevels = [];
let gameCoords;
/*=============== DATABASE ===============*/
firebase.initializeApp({
  apiKey: 'AIzaSyCzAMh0oEmf7-5w9dJMqKbBfu04D3DpsTU',
  authDomain: 'where-is-waldo-11032.firebaseapp.com',
  projectId: 'where-is-waldo-11032',
});

const db = firebase.firestore();
/*=============== START PLAYING ===============*/
const data = db
  .collection('gameCoords')
  .doc('SiPAB585BQxK4VKUdiOH')
  .get()
  .then((snap) => {
    gameCoords = snap.data();
    prepareGameBoard();
    play(currentLevel.wichLevel);
  });

/*=============== FUNCTIONS ===============*/
// devide gameboard into parts
function prepareGameBoard() {
  gameBoard.innerHTML = '';
  let count = 1;
  for (let i = 0; i < 50; i++) {
    const div = document.createElement('div');
    div.classList.add('bg-square', 'sq');
    div.id = 'bg' + count;
    count++;
    gameBoard.append(div);
  }
}
// devide squares into small ones
function devide(divToDevide, name) {
  let count = 1;
  for (let i = 0; i < 50; i++) {
    const div = document.createElement('div');
    div.classList.add('sm-square', 'sq');
    div.id = name + count;
    count++;
    divToDevide.append(div);
  }
}
// update level info
function updateCurrentLevelInfo(level) {
  const hiddenCharacters = gameInfo[level].characters;
  const levelImg = gameInfo[level].img;
  currentLevel.wichLevel = level;
  currentLevel.levelImg = levelImg;
  currentLevel.hiddenC = {};
  for (let i = 0; i < hiddenCharacters.length; i++) {
    const { name, image, found } = hiddenCharacters[i];
    const { bgSquaresId, smallSquaresId } = gameCoords[level][name];
    currentLevel.hiddenC[name] = {};
    currentLevel.hiddenC[name].img = image;
    currentLevel.hiddenC[name].bgSquares = bgSquaresId;
    currentLevel.hiddenC[name].winIds = smallSquaresId;
    currentLevel.hiddenC[name].found = found;
  }
}
// play
function play(level) {
  updateCurrentLevelInfo(level);
  updateHeaderIcons();
  updateGameBoardImg();
  updateHtmlTitle1();
  updateHtmlTitle2();
  prepareGameBoard();
  btns.forEach((btn) => {
    btn.addEventListener('click', startPlaying);
  });
  const characters = currentLevel.hiddenC;
  for (let name in characters) {
    const array = characters[name].bgSquares;
    for (let id of array) {
      const div = document.getElementById(id);
      devide(div, name);
    }
  }
  const squares = gameBoard.querySelectorAll('.sq');
  squares.forEach((sq) => {
    sq.addEventListener('click', handleClick);
  });
}
// update header icons
function updateHeaderIcons() {
  charactersContainer.innerHTML = '';
  const characters = currentLevel.hiddenC;
  for (let prop in characters) {
    const imgUrl = characters[prop].img;
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = prop;
    img.title = prop;
    img.classList.add('character-img', prop);
    charactersContainer.append(img);
  }
}
// update gameboard level img
function updateGameBoardImg() {
  const levelImg = currentLevel.levelImg;
  gameBoard.style.backgroundImage = `url(${levelImg})`;
}
// update html titles
function updateHtmlTitle1() {
  const level = currentLevel.wichLevel;
  const levelNum = level.slice(5);
  heading1.innerHTML = `level: ${levelNum}`;
}

function updateHtmlTitle2() {
  heading2.innerHTML = `completed levels: ${completedLevels.length}/6`;
}

// add events to btns
function startPlaying(e) {
  const num = e.target.textContent.slice(4);
  const txt = 'level';
  play(`${txt}${num}`);
}

// handle square click
function handleClick(e) {
  e.stopPropagation();
  const div = e.target;
  const { x, y } = getDivCoords(div);
  // how much hidden characters in level
  const numOfChoices = getNumOfChoices();
  // 1 choice
  if (numOfChoices === 1) {
    let txt;
    for (let prop in currentLevel.hiddenC) {
      txt = prop;
    }
    const isWaldo = checkIfIsWaldo(txt, div.id);
    if (!isWaldo) {
      handleFalseResponse(x, y);
    } else {
      handleTrueResponse(txt, x, y);
    }
    return;
  }
  // multiple choices
  const choices = showSelectModel(x, y);
  for (let ch of choices) {
    ch.addEventListener('click', () => {
      const txt = ch.textContent;
      const isWaldo = checkIfIsWaldo(txt, div.id);
      if (!isWaldo) {
        handleFalseResponse(x, y);
      } else {
        handleTrueResponse(txt, x, y);
      }
    });
  }
}
// get div x y coords
function getDivCoords(div) {
  const coords = div.getBoundingClientRect();
  let width;
  let height;
  if (coords.width > 10) {
    width = coords.width / 10;
    height = coords.height / 20;
  } else {
    width = coords.width / 2;
    height = coords.height / 4;
  }
  const x = coords.left + width;
  const y = coords.top + height;
  return { x, y };
}

// false response
function handleFalseResponse(x, y) {
  showTrueFalseModel(false, x, y);
  setTimeout(() => {
    hide(smModel);
  }, 700);
}
// true response
function handleTrueResponse(txt, x, y) {
  const level = currentLevel.wichLevel;
  const img = document.querySelector(`.${txt}`);
  showTrueFalseModel(true, x, y);
  img.classList.add('offset');
  currentLevel.hiddenC[txt].found = true;
  const isLevelCompleted = checkIfLevelCompleted();
  if (isLevelCompleted) {
    // remove events
    const squares = gameBoard.querySelectorAll('.sq');
    squares.forEach((sq) => {
      sq.removeEventListener('click', handleClick);
    });
    btns.forEach((btn) => {
      btn.removeEventListener('click', startPlaying);
    });
    completedLevels.push(level);
    // check if game over
    const isGameOver = checkIfGameOver();
    if (isGameOver) {
      hide(smModel);
      setTimeout(() => {
        showGameOverModel();
      }, 700);
      return;
    }
    updateHtmlTitle2();
    hide(smModel);
    setTimeout(() => {
      showLevelCompletedModel(level);
    }, 700);
  } else {
    setTimeout(() => {
      hide(smModel);
    }, 700);
  }
}
// get num of choices
function getNumOfChoices() {
  let count = 0;
  for (let prop in currentLevel.hiddenC) {
    count++;
  }
  return count;
}
// show model of completed level
function showLevelCompletedModel(level) {
  const num = level.slice(5);
  const modelContainer = document.querySelector('.modelContainer');
  const model = document.querySelector('.model');
  const para = document.createElement('p');
  para.innerHTML = `congrats you completed level ${num}!`;
  const btn = document.createElement('button');
  btn.textContent = 'next';
  model.append(para, btn);
  modelContainer.classList.add('show');
  btn.addEventListener('click', () => {
    model.innerHTML = '';
    modelContainer.classList.remove('show');
    const nonCompletedLevels = getNCLevels();
    const nextLevel = nonCompletedLevels[0];
    play(nextLevel);
  });
}
// get non completed levels
function getNCLevels() {
  const nCompleted = [];
  const allLevels = [
    'level1',
    'level2',
    'level3',
    'level4',
    'level5',
    'level6',
  ];
  for (let level of allLevels) {
    if (completedLevels.indexOf(level) < 0) {
      nCompleted.push(level);
    }
  }
  return nCompleted;
}

// check if game over
function checkIfGameOver() {
  if (completedLevels.length === 6) {
    return true;
  }
  return false;
}
// check if level completed
function checkIfLevelCompleted() {
  for (let character in currentLevel.hiddenC) {
    if (currentLevel.hiddenC[character].found === false) {
      return false;
    }
  }
  return true;
}

// hide small model
function hide(smModel) {
  smModel.innerHTML = '';
  smModel.classList.remove('select', 'success', 'danger');
  smModel.style.visibility = 'hidden';
}
// show select model
function showSelectModel(x, y) {
  smModel.innerHTML = '';
  smModel.classList.add('select');
  smModel.classList.remove('success', 'danger');
  const choices = [];
  for (let prop in currentLevel.hiddenC) {
    const choice = document.createElement('h5');
    choice.textContent = prop;
    choices.push(choice);
    smModel.append(choice);
  }
  smModel.style.visibility = 'visible';
  smModel.style.left = x + 'px';
  smModel.style.top = y + 'px';
  return choices;
}
// show found or not
function showTrueFalseModel(bool, x, y) {
  smModel.innerHTML = '';
  smModel.classList.remove('select');
  const resp = document.createElement('h6');
  let text;
  let classe;
  if (bool) {
    text = 'true';
    classe = 'success';
  } else {
    text = 'false';
    classe = 'danger';
  }
  resp.textContent = text;
  smModel.classList.add(classe);
  smModel.append(resp);
  smModel.style.visibility = 'visible';
  smModel.style.left = x + 'px';
  smModel.style.top = y + 'px';
}

// check if waldo
function checkIfIsWaldo(resp, ID) {
  const ids = currentLevel.hiddenC[resp].winIds;
  if (ids.indexOf(ID) >= 0) {
    return true;
  }
  return false;
}

// gameover
function showGameOverModel() {
  const modelContainer = document.querySelector('.modelContainer');
  const model = modelContainer.querySelector('.model');
  model.innerHTML = '';
  const title = document.createElement('h2');
  const para = document.createElement('p');
  const btn = document.createElement('button');
  title.innerHTML = 'Hero of hidden waldo!';
  para.innerHTML = 'Congratulation You Won all levels';
  btn.textContent = 'refresh';
  model.append(title, para, btn);
  modelContainer.classList.add('show');
  btn.addEventListener('click', () => window.location.reload());
}
