// Atur koneksi API Hive
hive.api.setOptions({ url: 'https://api.hive.blog' });

// Ambil Chain ID dari API Hive secara otomatis
function fetchChainID() {
    hive.api.getConfig(function(err, result) {
        if (!err && result.HIVE_CHAIN_ID) {
            hive.config.set('chain_id', result.HIVE_CHAIN_ID);
            console.log("Chain ID set to:", result.HIVE_CHAIN_ID);
        } else {
            console.error("Failed to fetch Chain ID:", err);
        }
    });
}
fetchChainID();

// Fungsi untuk memuat data dari localStorage jika ada
function loadData() {
    const savedUsername = localStorage.getItem('hiveUsername');
    const savedPostingKey = localStorage.getItem('postingKey');
    const savedBeneficiaryAccounts = localStorage.getItem('beneficiaryAccounts');
    const savedBeneficiaryPercents = localStorage.getItem('beneficiaryPercents');

    if (savedUsername) {
        document.getElementById('author').value = savedUsername;
    }
    if (savedPostingKey) {
        document.getElementById('wif').value = savedPostingKey;
    }
    if (savedBeneficiaryAccounts) {
        document.getElementById('beneficiaryAccounts').value = savedBeneficiaryAccounts;
    }
    if (savedBeneficiaryPercents) {
        document.getElementById('beneficiaryPercents').value = savedBeneficiaryPercents;
    }

    // Update the footer link text and URL with the username and posting key
    //updateFooter();
}

// Fungsi untuk menyimpan data ke localStorage
function saveData() {
    const username = document.getElementById('author').value.trim();
    const postingKey = document.getElementById('wif').value.trim();
    const beneficiaryAccounts = document.getElementById('beneficiaryAccounts').value.trim();
    const beneficiaryPercents = document.getElementById('beneficiaryPercents').value.trim();

    if (username && postingKey) {
        localStorage.setItem('hiveUsername', username);
        localStorage.setItem('postingKey', postingKey);
    }

    if (beneficiaryAccounts && beneficiaryPercents) {
        localStorage.setItem('beneficiaryAccounts', beneficiaryAccounts);
        localStorage.setItem('beneficiaryPercents', beneficiaryPercents);
    }

    // Update the footer link text and URL with the username and posting key
    //updateFooter();
}

// Fungsi untuk mengupdate teks dan link di footer

// Fungsi untuk menghapus isi dari kolom Parent Post URL dan Comment Body
function clearFields() {
    document.getElementById('parent').value = "";
    document.getElementById('commentBody').value = "";
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type) {
    var notification = document.getElementById('notification');
    notification.innerHTML = message;

    // Menentukan warna berdasarkan tipe pesan
    if (type === "success") {
        notification.style.backgroundColor = "#4CAF50";  // Hijau
    } else if (type === "error") {
        notification.style.backgroundColor = "#F44336";  // Merah
    } else if (type === "warning") {
        notification.style.backgroundColor = "#FF9800";  // Kuning
    }

    notification.style.display = 'block';  // Menampilkan pesan

    // Menyembunyikan setelah 3 detik
    setTimeout(function() {
        notification.style.display = 'none';
    }, 10000);
}

// Fungsi untuk mengirimkan komentar ke Hive
function postComment() {
    var wif = document.getElementById('wif').value.trim();
    var author = document.getElementById('author').value.trim();
    var parentUrl = document.getElementById('parent').value.trim();
    var body = document.getElementById('commentBody').value.trim();
    var permlink = 'comment-' + new Date().getTime();
    var beneficiaryAccounts = document.getElementById('beneficiaryAccounts').value.split(',').map(acc => acc.trim()).filter(Boolean);
    var beneficiaryPercents = document.getElementById('beneficiaryPercents').value.split(',').map(pct => parseInt(pct.trim()) * 100).filter(Boolean);

    // Validasi Private Posting Key
    if (!/^5[HJK][1-9A-HJ-NP-Za-km-z]{49}$/.test(wif)) {
        showNotification("Invalid Private Posting Key format!", "error");
        return;
    }

    // Validasi format Parent URL
    var urlParts = parentUrl.match(/^https:\/\/hive.blog\/@([\w.-]+)\/([\w-]+)$/);
    if (!urlParts) {
        showNotification("Invalid Parent URL format! Use: https://hive.blog/@author/permlink", "error");
        return;
    }
    var parentAuthor = urlParts[1];
    var parentPermlink = urlParts[2];

    // Validasi data yang harus diisi
    if (!wif || !author || !parentAuthor || !parentPermlink || !body) {
        showNotification("Please fill in all fields.", "error");
        return;
    }

    // Set beneficiaries jika ada
    var extensions = [];
    if (beneficiaryAccounts.length > 0 && beneficiaryPercents.length > 0 && beneficiaryAccounts.length === beneficiaryPercents.length) {
        var totalWeight = beneficiaryPercents.reduce((sum, weight) => sum + weight, 0);
        if (totalWeight > 10000) {
            showNotification("Total beneficiary percentage cannot exceed 100%", "error");
            return;
        }

        var beneficiaries = beneficiaryAccounts.map((account, index) => ({ account: account, weight: beneficiaryPercents[index] }));
        extensions = [[0, { beneficiaries: beneficiaries }]];
    }

    var jsonMetadata = JSON.stringify({
        tags: ['comment'],
        app: 'newPost/v1.0'
    });

    console.log("Posting comment with:", {wif, parentAuthor, parentPermlink, author, permlink, body, jsonMetadata});

    // Kirim komentar ke Hive
    hive.broadcast.comment(
        wif,
        parentAuthor,
        parentPermlink,
        author,
        permlink,
        '',
        body,
        jsonMetadata,
        function (err, result) {
            if (err) {
                console.error("Error posting comment:", err);
                showNotification('Error posting comment: ' + err.message, "error");
            } else {
                console.log("Comment posted successfully!", result);
                setCommentOptions(wif, author, permlink, extensions, function(success) {
                    if (success) {
                        showNotification('Comment and Beneficiaries set successfully!', "success");
                    } else {
                        showNotification('Comment posted successfully, but failed to set beneficiaries.', "warning");
                    }
                });
            }
        }
    );
}

function setCommentOptions(wif, author, permlink, extensions, callback) {
    if (extensions.length === 0) {
        callback(true);
        return;
    }

    hive.broadcast.commentOptions(
        wif,
        author,
        permlink,
        "1000000.000 HBD",
        10000,
        true,
        true,
        extensions,
        function(err, result) {
            if (err) {
                console.error("Error setting comment options:", err);
                callback(false);
            } else {
                console.log("Comment options set successfully!", result);
                callback(true);
            }
        }
    );
}

// Load data when the page loads
window.onload = function() {
    loadData();
}
