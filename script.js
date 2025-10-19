// Load currency options
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency")
const result = document.getElementById("result");

async function loadCurrencies() {
  const res = await fetch("https://api.frankfurter.app/currencies");
  const currencies = await res.json();

  for (let code in currencies) {
    fromCurrency.innerHTML += `<option value="${code}">${code}</option>`;
    toCurrency.innerHTML += `<option value="${code}">${code}</option>`;
  }
  fromCurrency.value = "USD"; // Default
  toCurrency.value = "PHP";   // Default
}

async function convertCurrency() {
  let amount = document.getElementById("amount").value;
  if (amount === "" || amount <= 0) {
    result.innerText = "Please enter a valid amount.";
    return;
  }

  let from = fromCurrency.value;
  let to = toCurrency.value;

  const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
  const data = await res.json();

  result.innerText = `${amount} ${from} = ${data.rates[to]} ${to}`;
}

loadCurrencies();
