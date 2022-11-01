import * as cheerio from 'cheerio';

export default {
  async fetch(request, env) {
    return await handleRequest(request).catch(
      (err) => new Response(err.stack, {status: 500})
    )
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetchAndCache(...getToday()));
  },
}

let MENU_CACHE = {}
let CACHE_SIZE = 100
let CACHE_ENABLED = true

function getTargetDateString(day, month, year) {
  day = String(day).padStart(2, '0')
  month = String(month).padStart(2, '0')
  return `${day}-${month}-${year}`
}

function getToday() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; //months from 1-12
  const day = date.getUTCDate();

  return [day, month, year];
}

async function handleRequest(request) {
  const {pathname} = new URL(request.url);

  if (pathname === '/clear-cache') {
    MENU_CACHE = {}
    return new Response('Cache cleared.');
  }

  if (pathname === '/disable-cache') {
    MENU_CACHE = {}
    CACHE_ENABLED = false
    return new Response('Cache disabled.');
  }

  if (pathname === '/enable-cache') {
    MENU_CACHE = {}
    CACHE_ENABLED = true
    return new Response('Cache enabled.');
  }

  if (pathname === '/favicon.ico') {
    return new Response('', {status: 200})
  }

  return handleMenuRequest(request)
}

async function handleMenuRequest(request) {
  let [day, month, year] = getToday();

  const {pathname} = new URL(request.url);
  const params = pathname.split('/').filter(Number)

  switch (params.length) {
    case 1: [day] = params; break
    case 2: [day, month] = params; break
    case 3: [day, month, year] = params; break
  }

  const menu = await getMenu(day, month, year);
  return new Response(menu, {status: 200})
}

async function getMenu(day, month, year) {
  const targetDate = getTargetDateString(day,month,year)
  let menu = MENU_CACHE[targetDate]
  if (!menu) {
    [,menu] = await fetchAndCache(day, month, year);
  }
  return menu
}

async function fetchAndCache(day, month, year) {
  const targetDate = getTargetDateString(day,month,year)
  console.log(`* Fetching and caching ${targetDate}`);

  let [success, menu] = await fetchMenu(day, month, year);
  console.log(`** Success: ${success}`);

  if (Object.keys(MENU_CACHE).length >= CACHE_SIZE) {
    MENU_CACHE = {}
  }

  if (success && CACHE_ENABLED) {
    MENU_CACHE[targetDate] = menu;
  }

  return [success, menu];
}

async function fetchMenu(day, month, year) {
  const targetDate = getTargetDateString(day,month,year)
  const readableTargetDate = targetDate.split('-').join('/')

  const url = `http://www.beslenme.yildiz.edu.tr/yemekMenusu/${+month}/${year}`
  const page = await fetch(url);
  const html = await page.text()
  const $ = cheerio.load(html);

  const row = $('.page-content > .row')
  const cols = $('> div', row)

  let colBody = null;
  cols.each((i, el) => {
    const footer = $('.card-footer', el)
    const colDate = footer.text().trim()
    if (colDate.startsWith(targetDate)) {
      colBody = $('.card-body', el)
    }
  })

  let res;
  let success = false;

  if (colBody == null) {
    res = `${readableTargetDate} yemek listesini bulamadım, bugün aç kalıcaz galiba.`
  } else {
    const row2 = $('.row:nth-of-type(2)', colBody)
    const row3 = $('.row:nth-of-type(3)', colBody)
    const studentNoon = $('> div:nth-of-type(1)', row2)
    const studentEvening = $('> div:nth-of-type(1)', row3)
    const aLaCarteMenu = $('> div:nth-of-type(2)', row2)

    let texts = [
      studentNoon.text(),
      studentEvening.text(),
      aLaCarteMenu.text()
    ]

    texts.forEach(function (text, index) {
      let lines = []
      let split = text.split('\n')

      for (let line of split) {
        line = line.trim().toLocaleLowerCase('tr')
        if (line !== 'öğle' || line !== 'akşam') {
          lines.push(line)
        }
      }
      texts[index] = lines.join('\n')
    });
    
    res = `${readableTargetDate}\nYemekhane Menü\n\n`
    res += '***** ÖĞRENCİ/PERSONEL *****\n\n'
    res += `------ ÖĞLE ------\n`
    res += texts[0]
    res += '\n------ AKŞAM ------\n'
    res += texts[1]
    res += '\n***** [A LA CARTE MENU] *****\n\n'
    res += `------ ÖĞLE ------\n`
    res += texts[2]

    if (texts.flat().filter(Boolean).length >= 2) {
      success = true;
    }
  }

  return [success, res];
}