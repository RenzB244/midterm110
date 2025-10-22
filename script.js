// Load currency options
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency")
const result = document.getElementById("result");

async function loadCurrencies() {
  try {
    const res = await fetch("https://api.frankfurter.app/currencies");
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const currencies = await res.json();

    for (let code in currencies) {
      fromCurrency.innerHTML += `<option value="${code}">${code}</option>`;
      toCurrency.innerHTML += `<option value="${code}">${code}</option>`;
    }
    fromCurrency.value = "USD"; // Default
    toCurrency.value = "PHP";   // Default
  } catch (error) {
    console.error("Error loading currencies:", error);
    result.innerText = "Error: Unable to load currencies. Please check your internet connection.";
  }
}

async function convertCurrency() {
  let amount = document.getElementById("amount").value;
  if (amount === "" || amount <= 0) {
    result.innerText = "Please enter a valid amount.";
    return;
  }

  let from = fromCurrency.value;
  let to = toCurrency.value;

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.rates || !data.rates[to]) { 

      throw new Error("Invalid response from currency API");
    }

    result.innerText = `${amount} ${from} = ${data.rates[to]} ${to}`;
  } catch (error) {
    console.error("Error converting currency:", error);
    result.innerText = "Error: Unable to convert currency. Please check your internet connection and try again.";
  }
}

function swapCurrencies() {
  // Get kuhaon sang current nga values
  const fromValue = fromCurrency.value;
  const toValue = toCurrency.value;
  
  // e Swap values
  fromCurrency.value = toValue;
  toCurrency.value = fromValue;
  
  // Clear ang result
  result.innerText = "";
}

loadCurrencies();
