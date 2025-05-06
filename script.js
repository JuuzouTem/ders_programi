document.addEventListener('DOMContentLoaded', () => {
    const dersAdiInput = document.getElementById('dersAdiInput');
    const dersRenkInput = document.getElementById('dersRenkInput'); // Renk seçici
    const dersOlusturBtn = document.getElementById('dersOlusturBtn');
    const dersKutucuklariAlani = document.getElementById('dersKutucuklariAlani');
    const dersProgramiTablosuBody = document.querySelector('#dersProgramiTablosu tbody');

    const saatler = [
        "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
        "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
        "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00",
        "20:00 - 21:00", "21:00 - 22:00", "22:00 - 23:00", "23:00 - 00:00" // Eklenen saatler
    ];
    const gunler = 7;

    let suruklenenDers = null;

    // Otomatik kaydırma için değişkenler
    let autoScrollIntervalId = null;
    let lastMouseY = 0;
    const SCROLL_SPEED = 15; // Kaydırma hızı (piksel/frame)
    const SCROLL_EDGE_THRESHOLD = 70; // Kaydırmayı tetikleyecek kenar mesafesi (piksel)

    // Farenin Y pozisyonunu güncellemek için document üzerinde genel bir dinleyici
    document.addEventListener('dragover', (event) => {
        lastMouseY = event.clientY;
    });

    function performAutoScroll() {
        if (!suruklenenDers) { // Eğer sürükleme bittiyse (dragEnd veya drop sonrası)
            if (autoScrollIntervalId) {
                cancelAnimationFrame(autoScrollIntervalId);
                autoScrollIntervalId = null;
            }
            return;
        }

        // Üst kenara yakınsa yukarı kaydır
        if (lastMouseY < SCROLL_EDGE_THRESHOLD) {
            window.scrollBy(0, -SCROLL_SPEED);
        }
        // Alt kenara yakınsa aşağı kaydır
        else if (lastMouseY > window.innerHeight - SCROLL_EDGE_THRESHOLD) {
            window.scrollBy(0, SCROLL_SPEED);
        }

        autoScrollIntervalId = requestAnimationFrame(performAutoScroll);
    }


    // Arka plan rengine göre kontrastlı metin rengi döndürür
    function getContrastingTextColor(hexColor) {
        if (!hexColor) return '#FFFFFF'; // Varsayılan
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#333333' : '#F8F9FA'; // Koyu veya açık renk
    }

    function tabloOlustur() {
        dersProgramiTablosuBody.innerHTML = '';
        saatler.forEach(saat => {
            const satir = document.createElement('tr');
            const saatHucresi = document.createElement('td');
            saatHucresi.textContent = saat;
            saatHucresi.classList.add('saat-etiketi');
            satir.appendChild(saatHucresi);

            for (let i = 0; i < gunler; i++) {
                const hucre = document.createElement('td');
                hucre.dataset.saat = saat;
                hucre.dataset.gunIndex = i;
                hucre.addEventListener('dragover', dragOver);
                hucre.addEventListener('dragenter', dragEnter);
                hucre.addEventListener('dragleave', dragLeave);
                hucre.addEventListener('drop', drop);
                satir.appendChild(hucre);
            }
            dersProgramiTablosuBody.appendChild(satir);
        });
    }

    dersOlusturBtn.addEventListener('click', () => {
        const dersAdi = dersAdiInput.value.trim();
        const dersRengi = dersRenkInput.value;

        if (dersAdi === "") {
            alert("Lütfen bir ders adı girin.");
            return;
        }

        const yeniDersKutusu = document.createElement('div');
        yeniDersKutusu.classList.add('ders-kutusu');
        yeniDersKutusu.textContent = dersAdi;
        yeniDersKutusu.draggable = true;

        yeniDersKutusu.style.backgroundColor = dersRengi;
        yeniDersKutusu.style.color = getContrastingTextColor(dersRengi);
        yeniDersKutusu.dataset.color = dersRengi;

        yeniDersKutusu.addEventListener('dragstart', dragStart);
        yeniDersKutusu.addEventListener('dragend', dragEnd);
        
        yeniDersKutusu.classList.add('newly-added-to-palette');
        dersKutucuklariAlani.appendChild(yeniDersKutusu);
        
        setTimeout(() => {
            yeniDersKutusu.classList.remove('newly-added-to-palette');
        }, 400);

        dersAdiInput.value = '';
        dersAdiInput.focus();
    });


    function dragStart(event) {
        suruklenenDers = event.target;
        event.dataTransfer.setData('text/plain', event.target.textContent);
        event.dataTransfer.effectAllowed = 'copy';
        
        setTimeout(() => {
            event.target.classList.add('dragging');
        }, 0);

        // Otomatik kaydırmayı başlat
        if (!autoScrollIntervalId) {
            autoScrollIntervalId = requestAnimationFrame(performAutoScroll);
        }
    }

    function dragEnd(event) {
        if (event.target.classList.contains('ders-kutusu')) { // Sadece ders kutusu ise
            event.target.classList.remove('dragging');
        }
        suruklenenDers = null; // suruklenenDers'i burada null yapıyoruz

        // Otomatik kaydırmayı durdur
        if (autoScrollIntervalId) {
            cancelAnimationFrame(autoScrollIntervalId);
            autoScrollIntervalId = null;
        }
    }

    function dragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    function dragEnter(event) {
        event.preventDefault();
        const hedef = event.target.closest('td');
        if (hedef && !hedef.classList.contains('saat-etiketi')) {
            hedef.classList.add('drag-over');
        }
    }

    function dragLeave(event) {
        const hedef = event.target.closest('td');
        if (hedef && !hedef.classList.contains('saat-etiketi')) {
            hedef.classList.remove('drag-over');
        }
    }

    function drop(event) {
        event.preventDefault();
        const hedefHucre = event.target.closest('td');
        if (!hedefHucre || hedefHucre.classList.contains('saat-etiketi') || !suruklenenDers) {
             // Eğer geçersiz bir hedefse veya sürüklenen ders yoksa, dragEnd çağrılmamış olabileceğinden
             // burada da sürüklemeyi sonlandır ve scroll'u durdur.
            if (suruklenenDers && suruklenenDers.classList) {
                 suruklenenDers.classList.remove('dragging');
            }
            suruklenenDers = null;
            if (autoScrollIntervalId) {
                cancelAnimationFrame(autoScrollIntervalId);
                autoScrollIntervalId = null;
            }
            return;
        }

        hedefHucre.classList.remove('drag-over');

        const dersAdi = event.dataTransfer.getData('text/plain');
        const dersRengi = suruklenenDers.dataset.color;
        
        const birakilanDersKutusu = document.createElement('div');
        birakilanDersKutusu.classList.add('ders-kutusu');
        birakilanDersKutusu.textContent = dersAdi;

        if (dersRengi) {
            birakilanDersKutusu.style.backgroundColor = dersRengi;
            birakilanDersKutusu.style.color = getContrastingTextColor(dersRengi);
            birakilanDersKutusu.dataset.color = dersRengi;
        }
        
        const deleteBtn = document.createElement('span');
        deleteBtn.innerHTML = '×';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.title = "Dersi Sil";
        if(dersRengi) {
            deleteBtn.style.color = getContrastingTextColor(dersRengi);
        } else {
            deleteBtn.style.color = getContrastingTextColor(null);
        }

        deleteBtn.onclick = function(e) {
            e.stopPropagation(); 
            birakilanDersKutusu.remove();
        };
        birakilanDersKutusu.appendChild(deleteBtn);
        
        hedefHucre.appendChild(birakilanDersKutusu);

        // Sürükleme bittiği için suruklenenDers'i null yapmaya gerek yok, dragEnd halledecek.
        // Ama scroll'u burada durdurmak iyi bir pratik olabilir, dragEnd bazen gecikebilir veya farklı senaryolarda tetiklenmeyebilir.
        // Aslında dragEnd her zaman tetiklenmeli.
        // suruklenenDers = null; // dragEnd'de zaten yapılıyor.
        // Otomatik kaydırmayı durdur (dragEnd de yapacak ama burada da güvenli)
        // if (autoScrollIntervalId) {
        //     cancelAnimationFrame(autoScrollIntervalId);
        //     autoScrollIntervalId = null;
        // }
        // dragEnd fonksiyonu bu işi üstlenecek.
    }

    tabloOlustur();
});