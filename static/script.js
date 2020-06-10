async function reload() {
  const container = document.querySelector('.plant-container');
  const response = await fetch('/generate');
  const body = await response.text();
  console.log(body);
  container.innerHTML = '';
  container.innerHTML = body;
}