
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

      // 🎬 Mise à jour de la vidéo selon la saison
      const video = document.getElementById("seasonVideo");
      const videoSource = document.getElementById("videoSource");
      const credit = document.getElementById("videoCredit");

      if (video && videoSource) {
        if (newSeason === "winter") {
          videoSource.src = "videos/intro_hiver.mp4";
          if (credit) credit.style.display = "block";
        } else {
          videoSource.src = "videos/intro_ete.mp4";
          if (credit) credit.style.display = "none";
        }
        video.load(); // recharge la vidéo
      }
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
        createOrder: async function (data, actions) {
            try {
                const order = await actions.order.create({
                    purchase_units: [{
                        amount: { value: currentPrice.toFixed(2) }
                    }]
                });
                return order;
            } catch (error) {
                console.error("Error creating order:", error);
                alert("Erreur lors de la création de la commande. Veuillez réessayer.");
                throw error; // Important pour arrêter l'exécution
            }
        },
        onApprove: async function (data, actions) {
            try {
                const details = await actions.order.capture();
                if (details.status === 'COMPLETED') {
                    console.log("Payment completed successfully:", details);

                    try {
                        console.log("Attempting to update database...");
                        console.log("selectedWeekStart:", selectedWeekStart);

                        await db.collection('weeks').doc(selectedWeekStart).update({ available: false });

                        console.log(`Week ${selectedWeekStart} marked as unavailable.`);
                        alert("Paiement effectué avec succès ! La semaine est maintenant réservée.");
                        // Tu peux aussi rediriger l'utilisateur vers une page de confirmation
                    } catch (error) {
                        console.error("Firestore update failed:", error);
                        alert("Erreur lors de la mise à jour de la réservation. Veuillez réessayer plus tard.");
                        // Tu peux aussi ajouter un mécanisme pour réessayer la mise à jour
                    }
                } else {
                    console.error("Payment not completed:", details);
                    alert("Le paiement n'a pas été complété. Veuillez réessayer.");
                }
            } catch (err) {
                console.error("Capture error:", err);
                alert("Erreur lors de la capture du paiement. Veuillez réessayer.");
            }
        },
        onError: function (err) {
            console.error('Erreur de paiement :', err);
            alert('Erreur de paiement. Veuillez réessayer.');
        }
    }).render('#paypal-button-container');

    });
  }
});

fetch('header.html')
    .then(res => res.text())
    .then(data => {
      document.getElementById('header-placeholder').innerHTML = data;

      // Appliquer la vidéo correcte dès le chargement du header
      const savedSeason = localStorage.getItem("season") || "summer";
      const video = document.getElementById("seasonVideo");
      const videoSource = document.getElementById("videoSource");
      const credit = document.getElementById("videoCredit");
      const switchInput = document.getElementById("seasonSwitch");
      const label = document.getElementById("seasonLabel");

      if (switchInput && label) {
        switchInput.checked = savedSeason === "winter";
        label.textContent = savedSeason === "winter" ? "❄️ Hiver" : "☀️ Été";
      }

      if (video && videoSource) {
        if (savedSeason === "winter") {
          videoSource.src = "videos/intro_hiver.mp4";
          if (credit) credit.style.display = "block";
        } else {
          videoSource.src = "videos/intro_ete.mp4";
          if (credit) credit.style.display = "none";
        }
        video.load(); // Recharge la vidéo avec la bonne source
      }
    });

document.addEventListener("DOMContentLoaded", function () {
  const langSwitch = document.getElementById("langSwitch");
  const langLabel = document.getElementById("langLabel");

  langSwitch.addEventListener("change", function () {
    const isEnglish = langSwitch.checked;
    document.querySelectorAll(".lang-fr").forEach(el => {
      el.classList.toggle("hidden", isEnglish);
    });
    document.querySelectorAll(".lang-en").forEach(el => {
      el.classList.toggle("hidden", !isEnglish);
    });
    langLabel.textContent = isEnglish ? "🇬🇧 English" : "🇫🇷 Français";
  });
});

