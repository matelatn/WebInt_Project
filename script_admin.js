
   
    const firebaseConfig = {
        apiKey: "AIzaSyC37gamjZ4u7Sm-JrPEkv_HwVAxMTRM1Hc",
        authDomain: "leflocon-6e2e6.firebaseapp.com",
        databaseURL: "https://leflocon-6e2e6-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "leflocon-6e2e6",
        storageBucket: "leflocon-6e2e6.appspot.com",
        messagingSenderId: "733812586803",
        appId: "1:733812586803:web:715c434f3eaa265fc56646"
      };
      firebase.initializeApp(firebaseConfig);
      const auth = firebase.auth();
      const db = firebase.database();
      
      const loginForm = document.getElementById('loginForm');
      const adminForm = document.getElementById('adminForm');
      const loginMessage = document.getElementById('loginMessage');
      const adminMessage = document.getElementById('adminMessage');
      const subtitle = document.getElementById('subtitle');
      const logoutButton = document.getElementById('logoutButton');
      
      function clearMessages() {
        loginMessage.textContent = '';
        adminMessage.textContent = '';
        loginMessage.className = 'message';
        adminMessage.className = 'message';
      }
      
      function isSaturday(dateStr) {
        const date = new Date(dateStr + 'T00:00:00Z');
        return date.getUTCDay() === 6;
      }
      
      function showAdminView(userEmail) {
        loginForm.classList.add('hidden');
        adminForm.classList.remove('hidden');
        subtitle.textContent = "Connecté en tant que : " + userEmail;
        clearMessages();
      }
      
      function showLoginView() {
        adminForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        subtitle.textContent = "Veuillez vous connecter pour accéder à la gestion des tarifs.";
        clearMessages();
        loginForm.reset();
        adminForm.reset();
      }
      
      auth.onAuthStateChanged(user => {
        if (user) {
          showAdminView(user.email);
        } else {
          showLoginView();
        }
      });
      
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        clearMessages();
      
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;
      
        if (!email || !password) {
          loginMessage.textContent = "Merci de remplir tous les champs.";
          loginMessage.classList.add("error");
          return;
        }
      
        auth.signInWithEmailAndPassword(email, password)
          .then(() => {
            // Auth state listener updates UI
          })
          .catch(error => {
            loginMessage.textContent = error.message;
            loginMessage.classList.add("error");
          });
      });
      
      adminForm.addEventListener('submit', async e => {
        e.preventDefault();
        clearMessages();
      
        const startDate = adminForm.startDate.value;
        const price = parseFloat(adminForm.price.value);
      
        if (!startDate) {
          adminMessage.textContent = "Veuillez sélectionner une date de début.";
          adminMessage.classList.add("error");
          return;
        }
        if (!isSaturday(startDate)) {
          adminMessage.textContent = "La date doit être un samedi.";
          adminMessage.classList.add("error");
          return;
        }
        if (isNaN(price) || price < 0) {
          adminMessage.textContent = "Veuillez entrer un prix valide supérieur ou égal à zéro.";
          adminMessage.classList.add("error");
          return;
        }
      
        try {
          await db.ref('weeks/' + startDate).set({
            price: price,
            available: true
          });
          adminMessage.textContent = `Semaine du ${startDate} mise à jour avec succès.`;
          adminMessage.classList.add("success");
          adminForm.reset();
        } catch (e) {
          adminMessage.textContent = "Erreur lors de la mise à jour : " + e.message;
          adminMessage.classList.add("error");
        }
      });
      
      logoutButton.addEventListener('click', () => {
        auth.signOut();
      });