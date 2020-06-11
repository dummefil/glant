const types = ['plants'];

async function reload() {
  const container = document.querySelector('.plant-container');
  const query = getQueryString();
  const url = `/generate` + query;
  const response = await fetch(url);
  const body = await response.text();
  container.innerHTML = '';
  container.innerHTML = body;
}

function selectCheckBox(target) {
  const el = target.querySelector('.checkbox')
  const selector = 'checkbox-checked';
  const type = el.getAttribute('data-type');
  if (el.classList.contains(selector)) {
    el.classList.remove(selector);
    return removeType(type);
  }
  el.classList.add(selector);
  return addType(type);
}

function removeType(type) {
  const index = types.indexOf(type);
  if (index > -1) {
    types.splice(index, 1);
  }
}

function addType(type) {
  types.push(type);
}

function getQueryString() {
  if (types.length) {
    return `?types=${types.join(',')}`;
  }
  return '';
}