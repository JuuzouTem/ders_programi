document.addEventListener('DOMContentLoaded', () => {
    const dersAdiInput = document.getElementById('dersAdiInput');
    const dersRenkInput = document.getElementById('dersRenkInput');
    const dersOlusturBtn = document.getElementById('dersOlusturBtn');
    const dersKutucuklariAlani = document.getElementById('dersKutucuklariAlani');
    const dersProgramiTablosuBody = document.querySelector('#dersProgramiTablosu tbody');

    const saatler = [
        "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
        "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
        "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00",
        "20:00 - 21:00", "21:00 - 22:00", "22:00 - 23:00", "23:00 - 00:00"
    ];
    const gunler = 7;
    let suruklenenDers = null;

    const localStorageKeys = {
        palette: 'weeklySchedulePaletteCourses',
        schedule: 'weeklyScheduleData'
    };

    // Otomatik kaydırma için değişkenler
    let autoScrollIntervalId = null;
    let lastMouseY = 0;
    const SCROLL_SPEED = 15;
    const SCROLL_EDGE_THRESHOLD = 70;

    document.addEventListener('dragover', (event) => {
        lastMouseY = event.clientY;
    });

    function performAutoScroll() {
        if (!suruklenenDers) {
            if (autoScrollIntervalId) {
                cancelAnimationFrame(autoScrollIntervalId);
                autoScrollIntervalId = null;
            }
            return;
        }
        if (lastMouseY < SCROLL_EDGE_THRESHOLD) {
            window.scrollBy(0, -SCROLL_SPEED);
        } else if (lastMouseY > window.innerHeight - SCROLL_EDGE_THRESHOLD) {
            window.scrollBy(0, SCROLL_SPEED);
        }
        autoScrollIntervalId = requestAnimationFrame(performAutoScroll);
    }

    function getContrastingTextColor(hexColor) {
        if (!hexColor) return '#FFFFFF';
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#333333' : '#F8F9FA';
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

    // --- LocalStorage Fonksiyonları ---
    function savePaletteToLocalStorage() {
        const paletteCourses = [];
        dersKutucuklariAlani.querySelectorAll('.ders-kutusu').forEach(box => {
            const nameSpan = box.querySelector('.course-name');
            if (nameSpan) {
                 paletteCourses.push({
                    name: nameSpan.textContent.trim(),
                    color: box.dataset.color
                });
            }
        });
        localStorage.setItem(localStorageKeys.palette, JSON.stringify(paletteCourses));
    }

    function loadPaletteFromLocalStorage() {
        const savedPalette = localStorage.getItem(localStorageKeys.palette);
        if (savedPalette) {
            try {
                const paletteCourses = JSON.parse(savedPalette);
                paletteCourses.forEach(course => {
                    createDersKutusuInPalette(course.name, course.color, false);
                });
            } catch (e) {
                console.error("Error parsing palette from localStorage:", e);
                localStorage.removeItem(localStorageKeys.palette);
            }
        }
    }

    function saveScheduleToLocalStorage() {
        const scheduleData = {};
        dersProgramiTablosuBody.querySelectorAll('td:not(.saat-etiketi)').forEach(cell => {
            const saat = cell.dataset.saat;
            const gunIndex = cell.dataset.gunIndex;
            const cellKey = `${saat}_${gunIndex}`;
            const coursesInCell = [];

            cell.querySelectorAll('.ders-kutusu').forEach(box => {
                 const nameSpan = box.querySelector('.course-name');
                 if(nameSpan) {
                    coursesInCell.push({
                        name: nameSpan.textContent.trim(),
                        color: box.dataset.color
                    });
                 }
            });

            if (coursesInCell.length > 0) {
                scheduleData[cellKey] = coursesInCell;
            }
        });
        localStorage.setItem(localStorageKeys.schedule, JSON.stringify(scheduleData));
    }

    function loadScheduleFromLocalStorage() {
        const savedSchedule = localStorage.getItem(localStorageKeys.schedule);
        if (savedSchedule) {
            try {
                const scheduleData = JSON.parse(savedSchedule);
                for (const cellKey in scheduleData) {
                    const [saat, gunIndex] = cellKey.split('_');
                    const hedefHucre = dersProgramiTablosuBody.querySelector(`td[data-saat="${saat}"][data-gun-index="${gunIndex}"]`);
                    
                    if (hedefHucre && scheduleData[cellKey]) {
                        scheduleData[cellKey].forEach(course => {
                            createDersKutusuInSchedule(hedefHucre, course.name, course.color, false);
                        });
                    }
                }
            } catch (e) {
                console.error("Error parsing schedule from localStorage:", e);
                localStorage.removeItem(localStorageKeys.schedule);
            }
        }
    }
    // --- /LocalStorage Fonksiyonları ---

    function addDeleteButtonToPaletteCourse(courseBox, color) {
        const deleteBtn = document.createElement('span');
        deleteBtn.innerHTML = '×';
        deleteBtn.classList.add('delete-palette-item-btn');
        deleteBtn.title = "Ders türünü sil";
        deleteBtn.style.color = getContrastingTextColor(color);

        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            courseBox.remove();
            savePaletteToLocalStorage();
        };
        courseBox.appendChild(deleteBtn);
    }
    
    function addDeleteButtonToScheduledCourse(courseBox, color) {
        const deleteBtn = document.createElement('span');
        deleteBtn.innerHTML = '×';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.title = "Dersi Sil";
        deleteBtn.style.color = getContrastingTextColor(color);

        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            courseBox.remove();
            saveScheduleToLocalStorage();
        };
        courseBox.appendChild(deleteBtn);
    }

    function createDersKutusuInPalette(dersAdi, dersRengi, animate = true) {
        const yeniDersKutusu = document.createElement('div');
        yeniDersKutusu.classList.add('ders-kutusu');
        
        const courseNameSpan = document.createElement('span');
        courseNameSpan.classList.add('course-name');
        courseNameSpan.textContent = dersAdi;
        yeniDersKutusu.appendChild(courseNameSpan);

        yeniDersKutusu.draggable = true;
        yeniDersKutusu.style.backgroundColor = dersRengi;
        yeniDersKutusu.style.color = getContrastingTextColor(dersRengi);
        yeniDersKutusu.dataset.color = dersRengi;

        yeniDersKutusu.addEventListener('dragstart', dragStart);
        yeniDersKutusu.addEventListener('dragend', dragEnd);
        
        addDeleteButtonToPaletteCourse(yeniDersKutusu, dersRengi);
        
        if (animate) {
            yeniDersKutusu.classList.add('newly-added-to-palette');
            setTimeout(() => {
                yeniDersKutusu.classList.remove('newly-added-to-palette');
            }, 400);
        }
        dersKutucuklariAlani.appendChild(yeniDersKutusu);
        return yeniDersKutusu;
    }

    function createDersKutusuInSchedule(hedefHucre, dersAdi, dersRengi, animate = true) {
        const birakilanDersKutusu = document.createElement('div');
        birakilanDersKutusu.classList.add('ders-kutusu');

        const courseNameSpan = document.createElement('span');
        courseNameSpan.classList.add('course-name');
        courseNameSpan.textContent = dersAdi;
        birakilanDersKutusu.appendChild(courseNameSpan);
        
        birakilanDersKutusu.style.backgroundColor = dersRengi;
        birakilanDersKutusu.style.color = getContrastingTextColor(dersRengi);
        birakilanDersKutusu.dataset.color = dersRengi;
        
        addDeleteButtonToScheduledCourse(birakilanDersKutusu, dersRengi);
        
        if (!animate) {
            birakilanDersKutusu.style.animation = 'none';
        }

        hedefHucre.appendChild(birakilanDersKutusu);
        return birakilanDersKutusu;
    }


    dersOlusturBtn.addEventListener('click', () => {
        const dersAdi = dersAdiInput.value.trim();
        const dersRengi = dersRenkInput.value;

        if (dersAdi === "") {
            alert("Lütfen bir ders adı girin.");
            return;
        }
        createDersKutusuInPalette(dersAdi, dersRengi);
        savePaletteToLocalStorage();

        dersAdiInput.value = '';
        dersAdiInput.focus();
    });


    function dragStart(event) {
        suruklenenDers = event.target;
        const courseNameSpan = event.target.querySelector('.course-name');
        const dersAdi = courseNameSpan ? courseNameSpan.textContent : event.target.textContent;
        event.dataTransfer.setData('text/plain', dersAdi);
        event.dataTransfer.effectAllowed = 'copy';

        // --- Özel Sürükleme Görüntüsü Oluşturma Başlangıcı ---
        const dragPreview = suruklenenDers.cloneNode(true);
        
        dragPreview.classList.remove('ders-kutusu'); 
        dragPreview.classList.remove('newly-added-to-palette');
        dragPreview.classList.add('drag-preview');

        dragPreview.style.backgroundColor = suruklenenDers.dataset.color;
        dragPreview.style.color = getContrastingTextColor(suruklenenDers.dataset.color);
        
        dragPreview.style.width = suruklenenDers.offsetWidth + 'px';
        dragPreview.style.height = suruklenenDers.offsetHeight + 'px';
        
        const paletteDeleteBtnInPreview = dragPreview.querySelector('.delete-palette-item-btn');
        if (paletteDeleteBtnInPreview) {
            paletteDeleteBtnInPreview.remove();
        }

        document.body.appendChild(dragPreview);

        const xOffset = dragPreview.offsetWidth / 2;
        const yOffset = dragPreview.offsetHeight / 2;
        event.dataTransfer.setDragImage(dragPreview, xOffset, yOffset);

        setTimeout(() => {
            if (dragPreview.parentNode) {
                document.body.removeChild(dragPreview);
            }
        }, 0);
        // --- Özel Sürükleme Görüntüsü Oluşturma Sonu ---

        setTimeout(() => {
            if(suruklenenDers) suruklenenDers.classList.add('dragging'); // suruklenenDers null değilse ekle
        }, 0);

        if (!autoScrollIntervalId) {
            autoScrollIntervalId = requestAnimationFrame(performAutoScroll);
        }
    }

    function dragEnd(event) {
        // suruklenenDers hâlâ geçerli bir DOM elemanıysa 'dragging' sınıfını kaldır
        if (suruklenenDers && suruklenenDers.classList && suruklenenDers.classList.contains('dragging')) {
            suruklenenDers.classList.remove('dragging');
        }
        suruklenenDers = null;

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
        
        if (hedefHucre) {
            hedefHucre.classList.remove('drag-over'); // Her durumda drag-over'ı kaldır
        }

        if (!hedefHucre || hedefHucre.classList.contains('saat-etiketi') || !suruklenenDers) {
            // suruklenenDers hâlâ geçerli bir DOM elemanıysa 'dragging' sınıfını kaldır
            // Bu, drop işlemi başarısız olduğunda orijinal elemanın stilini düzeltir
            if (suruklenenDers && suruklenenDers.classList && suruklenenDers.classList.contains('dragging')) {
                 suruklenenDers.classList.remove('dragging');
            }
            // suruklenenDers zaten dragEnd'de null olacak ama burada da kontrol etmek iyi
            // suruklenenDers = null; // dragEnd bunu halledecek
            if (autoScrollIntervalId) {
                cancelAnimationFrame(autoScrollIntervalId);
                autoScrollIntervalId = null;
            }
            return;
        }

        const dersAdi = event.dataTransfer.getData('text/plain');
        const dersRengi = suruklenenDers.dataset.color;
        
        createDersKutusuInSchedule(hedefHucre, dersAdi, dersRengi);
        saveScheduleToLocalStorage();
        
        // dragEnd fonksiyonu, suruklenenDers'i null yapacak ve dragging sınıfını kaldıracak.
        // Otomatik kaydırmayı durdurma da dragEnd'de yapılıyor.
    }

    // Başlangıçta tabloyu ve localStorage'dan verileri yükle
    tabloOlustur();
    loadPaletteFromLocalStorage();
    loadScheduleFromLocalStorage();
});