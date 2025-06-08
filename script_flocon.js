// Appliquer immédiatement le thème sauvegardé
(function applySavedSeasonEarly() {
  const savedSeason = localStorage.getItem("season") || "summer";
  document.documentElement.classList.add(savedSeason);
})();

document.addEventListener("DOMContentLoaded", () => {
  // Appliquer la classe à body
  const savedSeason = localStorage.getItem("season") || "summer";
  document.body.classList.add(savedSeason);
  toggleSeasonContent(savedSeason);

  // Gérer le switch été/hiver
  const switchInput = document.getElementById("seasonSwitch");
  const label = document.getElementById("seasonLabel");

  if (switchInput && label) {
    switchInput.checked = savedSeason === "winter";
    label.textContent = savedSeason === "winter" ? "❄️ Hiver" : "☀️ Été";

    switchInput.addEventListener("change", () => {
      const newSeason = switchInput.checked ? "winter" : "summer";
      document.body.classList.remove("summer", "winter");
      document.body.classList.add(newSeason);
      document.documentElement.classList.remove("summer", "winter");
      document.documentElement.classList.add(newSeason);
      label.textContent = newSeason === "winter" ? "❄️ Hiver" : "☀️ Été";
      localStorage.setItem("season", newSeason);
      toggleSeasonContent(newSeason);
    });
  }

  function toggleSeasonContent(season) {
    document.querySelectorAll('.summer-only').forEach(el => {
      el.style.display = (season === 'summer') ? '' : 'none';
    });
    document.querySelectorAll('.winter-only').forEach(el => {
      el.style.display = (season === 'winter') ? '' : 'none';
    });
  }

  // FAQ
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const expanded = question.getAttribute('aria-expanded') === 'true';
      question.setAttribute('aria-expanded', String(!expanded));
      const answer = question.nextElementSibling;
      if (answer) answer.hidden = expanded;
    });

    // Accessibilité
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
    });
  });

  // Navigation active
  const links = document.querySelectorAll(".navbar a");
  const currentUrl = window.location.href;
  links.forEach(link => {
    if (currentUrl.includes(link.getAttribute("href"))) {
      link.classList.add("active");
    }
  });

  // Carte (si présente)
  const mapElement = document.getElementById("map");
  if (mapElement) {
    const map = L.map('map').setView([45.3247, 6.5376], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([45.3247, 6.5376]).addTo(map).bindPopup('📍 Le Flocon').openPopup();
  }

  // Réservation (si présente)
  const priceDisplay = document.getElementById('price-display');
  const reserveButton = document.getElementById('reserveButton');
  const paypalContainer = document.getElementById('paypal-button-container');

  if (priceDisplay && reserveButton && paypalContainer) {
    let selectedWeekStart = null;
    let selectedWeekEnd = null;
    let currentPrice = 0;

    async function getWeekInfo(weekStart) {
      try {
        const docRef = db.collection('weeks').doc(weekStart);
        const doc = await docRef.get();
        return doc.exists ? doc.data() : null;
      } catch (error) {
        console.error("Firestore error:", error);
        return null;
      }
    }

    flatpickr("#calendar", {
      enableTime: false,
      dateFormat: "Y-m-d",
      minDate: "today",
      locale: { firstDayOfWeek: 1 },
      onChange: async function (selectedDates) {
        if (selectedDates.length === 0) {
          priceDisplay.textContent = "";
          reserveButton.disabled = true;
          paypalContainer.style.display = 'none';
          paypalContainer.innerHTML = "";
          return;
        }

        const selectedDate = selectedDates[0];
        let weekStart = new Date(selectedDate);
        const dayOfWeek = weekStart.getDay();
        if (dayOfWeek !== 6) {
          weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 1) % 7));
        }

        selectedWeekStart = weekStart.toISOString().split('T')[0];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        selectedWeekEnd = weekEnd.toISOString().split('T')[0];

        const weekInfo = await getWeekInfo(selectedWeekStart);

        if (weekInfo && weekInfo.available) {
          currentPrice = weekInfo.price || 0;
          priceDisplay.innerHTML = `Prix pour la semaine du ${selectedWeekStart} au ${selectedWeekEnd} : €${currentPrice}`;
          reserveButton.disabled = false;
          paypalContainer.style.display = 'none';
          paypalContainer.innerHTML = "";
        } else {
          priceDisplay.innerHTML = "Désolé, les dates sélectionnées ne sont pas disponibles.";
          reserveButton.disabled = true;
          paypalContainer.style.display = 'none';
          paypalContainer.innerHTML = "";
        }
      }
    });

    reserveButton.addEventListener('click', function () {
      this.style.display = 'none';
      paypalContainer.style.display = 'block';

      paypal.Buttons({
        createOrder: function (data, actions) {
          return actions.order.create({
            purchase_units: [{
              amount: { value: currentPrice.toFixed(2) }
            }]
          });
        },
        onApprove: function (data, actions) {
          return actions.order.capture().then(async (details) => {
            try {
              await db.collection('weeks').doc(selectedWeekStart).update({ available: false });
              console.log(`Week ${selectedWeekStart} marked as unavailable.`);
            } catch (error) {
              console.error("Firestore update failed:", error);
            }
          }).catch(err => {
            console.error("Capture error:", err);
            alert("Payment failed, please try again.");
          });
        },
        onError: function (err) {
          console.error('Erreur de paiement :', err);
          alert('Erreur de paiement. Veuillez réessayer.');
        }
      }).render('#paypal-button-container');
    });
  }
});
//Switch vidéo ETE/HIVER
document.addEventListener("DOMContentLoaded", function () {
  const seasonSwitch = document.getElementById("seasonSwitch");
  const video = document.getElementById("seasonVideo");
  const videoSource = document.getElementById("videoSource");
  const credit = document.getElementById("videoCredit");


  function updateVideoBySeason(isWinter) {
    if (isWinter) {
      videoSource.src = "videos/intro_hiver.mp4";
      credit.style.display = "block";
    } else {
      videoSource.src = "videos/intro_ete.mp4";
      credit.style.display = "none";
    }
    video.load();
  }

  updateVideoBySeason(seasonSwitch.checked);

  seasonSwitch.addEventListener("change", function () {
    updateVideoBySeason(this.checked);
  });
});
