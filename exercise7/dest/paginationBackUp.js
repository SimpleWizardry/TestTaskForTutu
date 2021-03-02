//Определяем все необходимые элементы DOM 
  let table = document.querySelector('#table');
  let pagination = document.querySelector('#pagination');
  let progress = document.querySelector('.current-progress');
  let progressWrapper = document.querySelector('.progress-wrapper');
  let search = document.querySelector('#search');
  let content = document.querySelector('#content');
  let btnForSmall = document.querySelector('.data-size__small');
  let btnForBig = document.querySelector('.data-size__big');

//"Кэшируем" данные для последующего переключения без подзагрузки
  let smallDataSet = []
  let bigDataSet = []

  let bigDataURL = 'http://www.filltext.com/?rows=1000&id=%7Bnumber%7C1000%7D&firstName=%7BfirstName%7D&delay=3&lastName=%7BlastName%7D&email=%7Bemail%7D&phone=%7Bphone%7C(xxx)xxx-xx-xx%7D&adress=%7BaddressObject%7D&description=%7Blorem%7C32%7D'
  let smallDataURL = "http://www.filltext.com/?rows=32&id=%7Bnumber%7C1000%7D&firstName=%7BfirstName%7D&lastName=%7BlastName%7D&email=%7Bemail%7D&phone=%7Bphone%7C(xxx)xxx-xx-xx%7D&adress=%7BaddressObject%7D&description=%7Blorem%7C32%7D"


//Функция запроса данных в зависимости от размера,так же берет на себя задачу отрисовки прогресбара 
async function getData(size) {
  let url;
  ( size == 'small') ? url = smallDataURL : url = bigDataURL
  let response = await fetch(url);

  const reader = response.body.getReader();

  //Если есть заголовок с длинной контента
  //const contentLength = +response.headers.get('Content-Length');

  let receivedLength = 0;
  let progressPercent = 0; // количество байт, полученных на данный момент
  let chunks = []; // массив полученных двоичных фрагментов (составляющих тело ответа)
  while(true) {
    const {done, value} = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);

    //Изходя из полученной в консоли длины, примерно 50000 байт является одним процентом для большого объема
    receivedLength += value.length;
    progressPercent += Math.floor(receivedLength/50000);

    progress.style.width = progressPercent + '%';
  }

  let chunksAll = new Uint8Array(receivedLength);
  let position = 0;
  for(let chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }

  let result = new TextDecoder("utf-8").decode(chunksAll);

  let data;
  if (size == 'small') {
    smallDataSet = JSON.parse(result) 
    data = smallDataSet
  } else {
    bigDataSet = JSON.parse(result) 
    data = bigDataSet
  }

  paginate(data);
}

//Скрываем все лишнее между переключением размеров данных
function hideInterface() {
  content.style.display = 'none';
  search.style.display = 'none';
  table.innerHTML = '';
  pagination.innerHTML = ''; 
}

//Подписываемся на клик по кнопкам с размерами и в зависимости от наличия данных в "кэше", либо загружаем их, либо мгновенно рендерим
function toggleDataSet() {
  btnForSmall.addEventListener('click', function() {
    this.classList.add("chosen");
    btnForBig.classList.remove("chosen");

    hideInterface();

    if (!smallDataSet.length) { 
      progressWrapper.style.display = 'block';
      getData('small');      
    } else {
      paginate(smallDataSet);
    }
  });

  btnForBig.addEventListener('click', function() {
    this.classList.add("chosen");
    btnForSmall.classList.remove("chosen");

    hideInterface();

    if (!bigDataSet.length) { 
      progressWrapper.style.display = 'block';
      getData('big');
    } else {
      paginate(bigDataSet);
    }
  });
}

//Вызов подписки(нужно будет добавить в иниализацию по загрузке страницы)
toggleDataSet();


//Функция рендера таблицы и пагинации
function paginate(users) {

  let notesOnPage = 50;
  let countOfItems = Math.ceil(users.length / notesOnPage);

  let showPage = (function() {
    let active;

    return function(item) {
      if (active) {
        active.classList.remove('active');
      }
      active = item;
      
      item.classList.add('active');
      
      let pageNum = +item.innerHTML;
      
      let start = (pageNum - 1) * notesOnPage;
      let end = start + notesOnPage;
      
      let notes = users.slice(start, end);
      

      function filterBy(event) {
        let title = event.target.closest('td').id;
        let sorted = event.target.closest('td').className;

        sortedNotes = notes.sort((prev, next) => {
          if (title == 'id') {
            return prev[title] - next[title]
          }
          else {
            if ( prev[title] < next[title] ) return -1;
            if ( prev[title] < next[title] ) return 1;
          }
        });

        (sorted == 'sorted-ascending') ? renderTable(sortedNotes.reverse(), title, sorted) : renderTable(sortedNotes, title, sorted)
      }

      function showContent(index) {
        let user = notes[index]
        let userMap = new Map();
        let name = '';
        
        for (key in user) {          
          if (key == 'firstName') {
            name += user[key]
          } 
          else if (key == 'lastName') {
            name = name + ' ' + user[key]
            userMap.set('name', name)           
          } 
          else if (key == 'description') {
            userMap.set('description', user[key])          
          } 
          else if (key == 'adress') {
            userMap.set('adress', user[key].streetAddress) 
            userMap.set('city', user[key].city) 
            userMap.set('state', user[key].state) 
            userMap.set('zip', user[key].zip)          
          }          
        }

        userMap.forEach((value, key) => {
          let id = '#content-' + key
          let holder = document.querySelector(id);
          holder.innerHTML = value          
        });       
      }

      //Подписываемся на клик по таблице и опеределяем дальнейшее действие: вывод контента ряда или фильтрация столбцов
      table.addEventListener('click', function() {
        let tr = event.target.closest('tr');
        (!tr.id) ? filterBy(event) : showContent(tr.id)
      });

      function renderTable(arr, sortedTitle = '', howSorted = '') {
        //Стираем старую таблицу
        table.innerHTML = '';


        //Собираем массив названий столбцов по порядку
        let titles = [];
        let instance = users[0]
        for (key in instance) {
          console.log(typeof instance[key] !== 'object' || key !== 'description')
          if (typeof instance[key] !== 'object' && key !== 'description') {
            titles.push(key);
          }
        }
        /* ПО УСЛОВИЮ ЭТИ СТОЛБЦЫ НЕ НУЖНЫ
        let titles = [];
        let instance = users[0]
        for (key in instance) {
          if (typeof instance[key] == 'object') {
            for (innerKey in instance[key]) {
              titles.push(innerKey);
            }
          } else {
            titles.push(key);
          }
        }
        */
        let trTitle = document.createElement('tr');
        table.appendChild(trTitle);

        for (let title of titles) {
          createTitleCell(title, trTitle, sortedTitle, howSorted);
        }

        //Таблица юзеров из массива-аргумента
        let notes = arr;
        for (let note of notes) {
          let tr = document.createElement('tr');
          table.appendChild(tr);
          index = notes.indexOf(note);
          createCell(note.id, tr, index);
          createCell(note.firstName, tr, index);
          createCell(note.lastName, tr, index);
          createCell(note.email, tr, index);
          createCell(note.phone, tr, index);


          /* ПО УСЛОВИЮ ЭТИ СТОЛБЦЫ НЕ НУЖНЫ
          createCell(note.adress.streetAddress, tr, index);
          createCell(note.adress.city, tr, index);
          createCell(note.adress.state, tr, index);
          createCell(note.adress.zip, tr, index);
          createCell(note.description, tr, index);
          */
        }
      }
    renderTable(notes)
    };
  }());

  let items = [];
  for (let i = 1; i <= countOfItems; i++) {
    let li = document.createElement('li');
    li.innerHTML = i;
    pagination.appendChild(li);
    items.push(li);
  }

  showPage(items[0]);

  for (let item of items) {
    item.addEventListener('click', function() {
      showPage(this);
    });
  }

  function createCell(text, tr, id) {
    let td = document.createElement('td');
    td.innerHTML = text;
    tr.id = id
    tr.appendChild(td);
  }

  function createTitleCell(text, tr, sorted, by) {
    let td = document.createElement('td');
    td.innerHTML = text;
    td.id = text;
  
    //Проверяем какой столбец отсортирован 
    if (td.id == sorted) {
      //Проверяем как отсортирован и меняем значение на обратное,либо сортируем по возрастанию при первом клике
      (by == 'sorted-ascending') ? td.classList.add('sorted-descending') : td.classList.add('sorted-ascending')
    }
  
    tr.appendChild(td);
  }


  progressWrapper.style.display = 'none';
  content.style.display = 'flex';
  search.style.display = 'flex';
}


/*---------------------------------------------------------------------------------

//Определяем все необходимые элементы DOM 
  let table = document.querySelector('#table');
  let pagination = document.querySelector('#pagination');

  let progress = document.querySelector('.current-progress');
  let progressWrapper = document.querySelector('.progress-wrapper'); 

  let content = document.querySelector('#content');

  let btnForSmall = document.querySelector('.data-size__small');
  let btnForBig = document.querySelector('.data-size__big');

  let search = document.querySelector('#search');
  let btnSearch = document.querySelector('#search-button');
  let inputSearch = document.querySelector('#search-input');

//"Кэшируем" данные для последующего переключения без подзагрузки
  let smallDataSet = []
  let bigDataSet = []

  let bigDataURL = 'http://www.filltext.com/?rows=1000&id=%7Bnumber%7C1000%7D&firstName=%7BfirstName%7D&delay=3&lastName=%7BlastName%7D&email=%7Bemail%7D&phone=%7Bphone%7C(xxx)xxx-xx-xx%7D&adress=%7BaddressObject%7D&description=%7Blorem%7C32%7D'
  let smallDataURL = "http://www.filltext.com/?rows=32&id=%7Bnumber%7C1000%7D&firstName=%7BfirstName%7D&lastName=%7BlastName%7D&email=%7Bemail%7D&phone=%7Bphone%7C(xxx)xxx-xx-xx%7D&adress=%7BaddressObject%7D&description=%7Blorem%7C32%7D"


//Функция запроса данных в зависимости от размера,так же берет на себя задачу отрисовки прогресбара 
async function getData(size) {
  let url;
  ( size == 'small') ? url = smallDataURL : url = bigDataURL
  let response = await fetch(url);

  const reader = response.body.getReader();

  //Если есть заголовок с длинной контента
  //const contentLength = +response.headers.get('Content-Length');

  let receivedLength = 0;
  let progressPercent = 0; // количество байт, полученных на данный момент
  let chunks = []; // массив полученных двоичных фрагментов (составляющих тело ответа)
  while(true) {
    const {done, value} = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);

    //Изходя из полученной в консоли длины, примерно 50000 байт является одним процентом для большого объема
    receivedLength += value.length;
    progressPercent += Math.floor(receivedLength/50000);

    progress.style.width = progressPercent + '%';
  }

  let chunksAll = new Uint8Array(receivedLength);
  let position = 0;
  for(let chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }

  let result = new TextDecoder("utf-8").decode(chunksAll);

  let data;
  if (size == 'small') {
    smallDataSet = JSON.parse(result) 
    data = smallDataSet
  } else {
    bigDataSet = JSON.parse(result) 
    data = bigDataSet
  }

  paginate(data);
}

//Скрываем все лишнее между переключением размеров данных
function hideInterface() {
  content.style.display = 'none';
  search.style.display = 'none';
  table.innerHTML = '';
  pagination.innerHTML = ''; 
}

//Подписываемся на клик по кнопкам с размерами и в зависимости от наличия данных в "кэше", либо загружаем их, либо мгновенно рендерим
function toggleDataSet() {
  btnForSmall.addEventListener('click', function() {
    this.classList.add("chosen");
    btnForBig.classList.remove("chosen");

    hideInterface();

    if (!smallDataSet.length) { 
      progressWrapper.style.display = 'block';
      getData('small');      
    } else {
      paginate(smallDataSet);
    }
  });

  btnForBig.addEventListener('click', function() {
    this.classList.add("chosen");
    btnForSmall.classList.remove("chosen");

    hideInterface();

    if (!bigDataSet.length) { 
      progressWrapper.style.display = 'block';
      getData('big');
    } else {
      paginate(bigDataSet);
    }
  });
}

//Вызов подписки(нужно будет добавить в иниализацию по загрузке страницы)
toggleDataSet();


//Функция рендера таблицы и пагинации
function paginate(users) {

  let notesOnPage = 50;
  let countOfItems = Math.ceil(users.length / notesOnPage);

  let showPage = (function() {
    let active;

    return function(item) {
      if (active) {
        active.classList.remove('active');
      }
      active = item;
      
      item.classList.add('active');
      
      let pageNum = +item.innerHTML;
      
      let start = (pageNum - 1) * notesOnPage;
      let end = start + notesOnPage;
      
      let notes = users.slice(start, end);
      let currentNotes = notes

      function sortBy(event) {
        let title = event.target.closest('td').id;
        let sorted = event.target.closest('td').className;

        /* РАБОТАЕТ ДЛЯ УСЛОВИЯ
        sortedNotes = notes.sort((prev, next) => {
          if (title == 'id') {
            return prev[title] - next[title]
          }
          else {
            if ( prev[title] < next[title] ) return -1;
            if ( prev[title] < next[title] ) return 1;
          }
        });
        */
        sortedNotes = notes.sort((prev, next) => {
          if (title == 'id') 
          {
            return prev[title] - next[title]
          }
          else if (title == 'streetAddress' || title == 'city' || title == 'state' || title == 'zip') 
          {
            if ( prev.adress[title] < next.adress[title] ) return -1;
            if ( prev.adress[title] < next.adress[title] ) return 1;
          }
          else 
          {
            if ( prev[title] < next[title] ) return -1;
            if ( prev[title] < next[title] ) return 1;
          }
        });

        (sorted == 'sorted-ascending') ? renderTable(sortedNotes.reverse(), title, sorted) : renderTable(sortedNotes, title, sorted)
      }

      function showContent(index) {
        let user = notes[index]
        let userMap = new Map();
        let name = '';
        
        for (key in user) {          
          if (key == 'firstName') {
            name += user[key]
          } 
          else if (key == 'lastName') {
            name = name + ' ' + user[key]
            userMap.set('name', name)           
          } 
          else if (key == 'description') {
            userMap.set('description', user[key])          
          } 
          else if (key == 'adress') {
            userMap.set('adress', user[key].streetAddress) 
            userMap.set('city', user[key].city) 
            userMap.set('state', user[key].state) 
            userMap.set('zip', user[key].zip)          
          }          
        }

        userMap.forEach((value, key) => {
          let id = '#content-' + key
          let holder = document.querySelector(id);
          holder.innerHTML = value          
        });       
      }



      //Подписываемся на клик по таблице и опеределяем дальнейшее действие: вывод контента ряда или фильтрация столбцов
      table.addEventListener('click', function() {
        let tr = event.target.closest('tr');
        (!tr.id) ? sortBy(event) : showContent(tr.id)
      });



      function renderTable(arr, sortedTitle = '', howSorted = '') {
        //Стираем старую таблицу
        table.innerHTML = '';

        //Собираем массив названий столбцов по порядку
        /*
        let titles = [];
        let instance = users[0]
        for (key in instance) {
          console.log(typeof instance[key] !== 'object' || key !== 'description')
          if (typeof instance[key] !== 'object' && key !== 'description') {
            titles.push(key);
          }
        }
        */

        /* ПО УСЛОВИЮ ЭТИ СТОЛБЦЫ НЕ НУЖНЫ */
        let titles = [];
        let instance = users[0]
        for (key in instance) {
          if (typeof instance[key] == 'object') {
            for (innerKey in instance[key]) {
              titles.push(innerKey);
            }
          } else {
            titles.push(key);
          }
        }
        

        //Подписываемся на клик по кнопке поиска
        btnSearch.addEventListener('click', function() {
          let subStr = inputSearch.value;
          let filteredArr = [];
          if (!subStr) {
            renderTable(arr)
          } else {
            arr.forEach(function(user, index, users) {
              for (key in user) {
                if (typeof user[key] == 'object') {
                  for (innerKey in user[key]) {
                    if (user[key][innerKey].includes(subStr)) {
                    //users.splice(index, 1)
                      filteredArr.push(user)
                      break;
                    } 
                    //(user[key].includes(subStr)) ? user[key] : users.splice(index, 1)
                    //console.log(user[key][innerKey])
                  }
                } 
                else if (typeof user[key] == 'number')
                {
                  //console.log(user[key])
                  if (String(user[key]).includes(subStr)) {
                    filteredArr.push(user)
                    break;
                  }
                  //console.log('number')
                } 
                else 
                {
                  if (user[key].includes(subStr)) {
                    //users.splice(index, 1)
                    filteredArr.push(user)
                    break;
                  }                
                }
              }
            })
            renderTable(filteredArr)
            console.log(filteredArr)
          }
        });


        let trTitle = document.createElement('tr');
        table.appendChild(trTitle);

        for (let title of titles) {
          createTitleCell(title, trTitle, sortedTitle, howSorted);
        }

        //Таблица юзеров из массива-аргумента
        let notes = arr;
        for (let note of notes) {
          let tr = document.createElement('tr');
          table.appendChild(tr);
          index = notes.indexOf(note);
          createCell(note.id, tr, index);
          createCell(note.firstName, tr, index);
          createCell(note.lastName, tr, index);
          createCell(note.email, tr, index);
          createCell(note.phone, tr, index);


          /* ПО УСЛОВИЮ ЭТИ СТОЛБЦЫ НЕ НУЖНЫ */
          createCell(note.adress.streetAddress, tr, index);
          createCell(note.adress.city, tr, index);
          createCell(note.adress.state, tr, index);
          createCell(note.adress.zip, tr, index);
          createCell(note.description, tr, index);
          
        }
      }      
    renderTable(notes)
    };
  }());

  let items = [];
  for (let i = 1; i <= countOfItems; i++) {
    let li = document.createElement('li');
    li.innerHTML = i;
    pagination.appendChild(li);
    items.push(li);
  }

  showPage(items[0]);

  for (let item of items) {
    item.addEventListener('click', function() {
      showPage(this);
    });
  }

  function createCell(text, tr, id) {
    let td = document.createElement('td');
    td.innerHTML = text;
    tr.id = id
    tr.appendChild(td);
  }

  function createTitleCell(text, tr, sorted, by) {
    let td = document.createElement('td');
    td.innerHTML = text;
    td.id = text;
  
    //Проверяем какой столбец отсортирован 
    if (td.id == sorted) {
      //Проверяем как отсортирован и меняем значение на обратное,либо сортируем по возрастанию при первом клике
      (by == 'sorted-ascending') ? td.classList.add('sorted-descending') : td.classList.add('sorted-ascending')
    }
  
    tr.appendChild(td);
  }


  progressWrapper.style.display = 'none';
  content.style.display = 'flex';
  search.style.display = 'flex';
}


