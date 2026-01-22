// --------------------------------------------------------------------------------------------------------------------------------------------
//
//  Developed by:
//    Gilberto Cortez
//
//  Website:
//    InteractiveUtopia.com
//
//  Description:
//    - Functions to work with Google Solar API
//
// --------------------------------------------------------------------------------------------------------------------------------------------
// Get data from latitude and longitude
async function findClosestBuildingInsights(latitude, longitude, apiKey) {
  // Validar API key
  if (!apiKey || apiKey === "YOUR_GOOGLE_API_KEY_HERE" || apiKey.includes("YOUR_GOOGLE_API_KEY")) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  // Form the request URL
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=HIGH&key=${apiKey}`;

  try {
    // Make the fetch request and wait for the response
    const response = await fetch(url);

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Tratar erros específicos
      if (response.status === 400) {
        if (errorData.error && errorData.error.message) {
          if (errorData.error.message.includes("API key") || errorData.error.message.includes("Invalid")) {
            throw new Error("API_KEY_INVALID");
          }
        }
        throw new Error("BAD_REQUEST");
      } else if (response.status === 403) {
        throw new Error("API_KEY_FORBIDDEN");
      } else if (response.status === 404) {
        throw new Error("NO_BUILDING_DATA");
      }
      
      throw new Error(`HTTP_ERROR_${response.status}`);
    }

    // Convert response to JSON and return
    const data = await response.json();
    
    // Verificar se há dados válidos
    if (!data || !data.solarPotential) {
      throw new Error("NO_BUILDING_DATA");
    }
    
    return data;
  } catch (error) {
    // Re-throw erros conhecidos
    if (error.message && error.message.startsWith("API_KEY_") || error.message.startsWith("HTTP_ERROR_") || error.message === "NO_BUILDING_DATA" || error.message === "BAD_REQUEST") {
      throw error;
    }
    // Erros de rede ou outros
    throw new Error("NETWORK_ERROR");
  }
}

// Update max value on range selector for # of modules
function changeMaxValue(element, new_max) {
  if (element && element.value > new_max) {
    element.value = new_max;
    element_modules_range_display.innerHTML = new_max;
  }
  element.max = new_max;
}

// Update value on range display span
function updateRange(rangeElement, displayElement) {
  displayElement.innerHTML = rangeElement.value;
}

// --------------------------------------------------------------------------------------------------------------------------------------------
// Total output calculation from # of modules * output watts
// --------------------------------------------------------------------------------------------------------------------------------------------
function calculate_output(rangeElement, wattsElement, displayElement) {
  // Calculate the total output in watts
  var totalWatts = Number(rangeElement.value) * Number(wattsElement.value);

  // Convert watts to kilowatts and round to two decimal places
  var totalKilowatts = (totalWatts / 1000).toFixed(2);

  // Update the display element with the formatted result
  displayElement.innerHTML = totalKilowatts + " kW";
}

// --------------------------------------------------------------------------------------------------------------------------------------------
// Add event listeners
// --------------------------------------------------------------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", (event) => {
  changeMaxValue(element_modules_range, 100);
  updateRange(element_modules_range, element_modules_range_display);
  // Add an event listener for the range input
  element_modules_range.addEventListener("input", () => {
    updateRange(element_modules_range, element_modules_range_display);
  });
  element_modules_range.addEventListener("change", () => {
    calculate_output(
      element_modules_range,
      element_modules_range_watts,
      element_modules_calculator_display
    );
  });
});
