// script_reservation.js
document.addEventListener('DOMContentLoaded', function () {
    const calendarInput       = document.getElementById('calendar');
    const priceDisplay        = document.getElementById('price-display');
    const reserveButton       = document.getElementById('reserveButton');
    const paypalContainer     = document.getElementById('paypal-button-container');
    const tenantFormContainer = document.getElementById('tenant-form-container');
    const introText           = document.querySelector('.intro-form');
    let selectedStartDate = null;
    let selectedEndDate   = null;
    let currentPrice      = 0;
    let tenantInfo        = {};

    // Initialise flatpickr
    const fp = flatpickr(calendarInput, {
        mode: "range",
        enableTime: false,
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: { firstDayOfWeek: 1 },
        onChange: onDateChange
    });

    function onDateChange(selectedDates) {
        if (selectedDates.length < 2) {
            priceDisplay.textContent = "";
            reserveButton.disabled = true;
            return;
        }
        selectedStartDate = selectedDates[0];
        selectedEndDate   = selectedDates[1];
        const msPerDay = 1000 * 60 * 60 * 24;
        const dayCount = Math.ceil((selectedEndDate - selectedStartDate) / msPerDay) + 1;

        if (dayCount > 15) {
            priceDisplay.innerHTML = "Vous ne pouvez réserver que 15 jours maximum.";
            reserveButton.disabled = true;
            return;
        }

        let total = 0;
        for (let d = new Date(selectedStartDate); d <= selectedEndDate; d.setDate(d.getDate() + 1)) {
            total += ([0,6].includes(d.getDay()) ? 150 : 90);
        }

        currentPrice = total;
        const startStr = selectedStartDate.toISOString().split('T')[0];
        const endStr   = selectedEndDate.toISOString().split('T')[0];
        priceDisplay.innerHTML = `Prix pour la période du ${startStr} au ${endStr} : €${currentPrice}`;
        reserveButton.disabled = false;
    }

    function showCalendarUI() {
        calendarInput.style.display = '';
        priceDisplay.style.display  = '';
        reserveButton.style.display = '';
    }
    function hideCalendarUI() {
        calendarInput.style.display = 'none';
        priceDisplay.style.display  = 'none';
        reserveButton.style.display = 'none';
    }

    function resetReservation() {
        fp.clear();
        selectedStartDate = selectedEndDate = null;
        currentPrice = 0; tenantInfo = {};
        tenantFormContainer.innerHTML = ''; tenantFormContainer.style.display = 'none';
        paypalContainer.innerHTML = ''; paypalContainer.style.display = 'none';
        priceDisplay.textContent = ''; reserveButton.disabled = true;
        showCalendarUI();


    }

    function showTenantForm() {
        // remplace par le texte du formulaire
        introText.textContent =
            'Veuillez remplir le formulaire de réservation ci-dessous :';
        paypalContainer.style.display = 'none';
        paypalContainer.innerHTML = '';
        hideCalendarUI();
        tenantFormContainer.style.display = 'block';
        tenantFormContainer.innerHTML = `
      <form id="tenant-form">
        <label>Nom : <input type="text" name="lastName" required></label><br>
        <label>Prénom : <input type="text" name="firstName" required></label><br>
        <label>Email : <input type="email" name="email" required></label><br>
        <label>Téléphone : <input type="tel" name="phone" required></label><br>
        <label>Nombre de résidents :
         <select name="residents" required>
         <option value="" disabled selected>-- Choisissez --</option>
         <option value="1">1</option>
         <option value="2">2</option>
         <option value="3">3</option>
         <option value="4">4</option>
         <option value="5">5</option>
         <option value="6">6</option>
      </select>
       </label><br>
        <button type="submit">Valider les informations</button>
      </form>
      <div id="info-summary" style="margin-top:1em;"></div>
    `;
        document.getElementById('tenant-form').addEventListener('submit', handleTenantForm);
    }

    function handleTenantForm(e) {
        e.preventDefault();
        const data = new FormData(e.target);
        tenantInfo = {
            lastName: data.get('lastName'),
            firstName: data.get('firstName'),
            email: data.get('email'),
            phone: data.get('phone'),
            residents: data.get('residents')
        };
        const summaryDiv = document.getElementById('info-summary');
        summaryDiv.innerHTML = `
      <strong>Veuillez confirmer vos informations :</strong>
      <ul>
        <li>Nom : ${tenantInfo.lastName}</li>
        <li>Prénom : ${tenantInfo.firstName}</li>
        <li>Email : ${tenantInfo.email}</li>
        <li>Téléphone : ${tenantInfo.phone}</li>
        <li>Nombre de résidents : ${tenantInfo.residents}</li>
      </ul>
      <button id="confirm-info">Confirmer et payer</button>
      <button id="edit-info" type="button">Modifier les infos</button>
      <button id="edit-dates" type="button">Modifier les dates</button>
    `;
        document.getElementById('confirm-info').addEventListener('click', () => {
            alert("Informations confirmées ! Redirection vers le paiement.");
            tenantFormContainer.style.display = 'none';
            initPayPal();
        });
        document.getElementById('edit-info').addEventListener('click', showTenantForm);
        document.getElementById('edit-dates').addEventListener('click', resetReservation);
    }

    function initPayPal() {
        introText.textContent =
            'Merci de procéder au paiement via PayPal ou Carte Bancaire'
        paypalContainer.style.display = 'block';
        paypalContainer.innerHTML = '';
        paypal.Buttons({
            createOrder: (data, actions) =>
                actions.order.create({ purchase_units: [{ amount: { value: currentPrice.toFixed(2) } }] }),
            onApprove: async (data, actions) => {
                const details = await actions.order.capture();
                if (details.status === 'COMPLETED') {
                    alert("Paiement effectué avec succès ! Votre réservation est confirmée.");
                    console.log("Tenant info:", tenantInfo);
                    resetReservation();
                } else {
                    alert("Le paiement n'a pas été complété. Veuillez réessayer.");
                }
            },
            onError: err => {
                console.error('Erreur de paiement :', err);
                alert('Erreur de paiement. Veuillez réessayer.');
            }
        }).render('#paypal-button-container');
    }

    reserveButton.addEventListener('click', showTenantForm);
});
