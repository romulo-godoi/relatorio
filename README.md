# ⏳ Registro de Campo Pioneiro (Pioneer Field Log)

A simple, modern, and efficient web application to help pioneers log and track their field service hours directly in the browser, without the need for installation. 

Available in English, Portuguese and Spanish 🇬🇧 🇧🇷 🇪🇸 

![image](https://github.com/user-attachments/assets/4af800c4-53ef-4a56-a651-43ccc294befb)


---

## ✨ Key Features

*   **Easy Activity Logging:** Add daily records by specifying the date (with a selector or "Today" as the default), time spent, activity type (Door-to-door, Cart, Letters, etc.), and optional notes.
*   **Smart Time Formatting:** Enter time as `HH:MM` (e.g., `2:30`), `HHMM` (e.g., `130` for 1h 30m), or just minutes (e.g., `45`). The field automatically inserts the colon `:` as you type numbers (`130` becomes `1:30`).
*   **Future Planning:** Schedule hours you plan to work on future dates.
*   **Interactive Dashboard:** Quickly view a summary of hours for the current week, total hours for the month, and progress towards your monthly goal in a donut chart.
*   **Goal Forecasting:** Calculate how many hours are left to reach your goal and see a suggested daily pace to achieve it.
*   **Monthly Goal Setting:** Customize your hourly goal for the month.
*   **Detailed Monthly Statistics:** View total hours, percentage progress, average hours per active day, and the number of active days in the month.
*   **Visual Monthly Chart:** Track your daily performance throughout the month in an interactive bar chart. Includes average lines (daily, estimated weekly, monthly for the year) for reference.
*   **Month Selection for Chart:** Easily view charts for previous months.
*   **Complete and Searchable History:** All your records are saved and can be searched by date, hours, activity type, or note content.
*   **Editing and Deletion:** Easily modify or remove records and plans.
*   **100% Local Storage:** Your data is **saved only in your browser** (using *Local Storage*), ensuring total privacy. No data is sent to external servers.
*   **Responsive Design:** A pleasant and functional interface on desktops, tablets, and mobile devices.
*   **Settings:** A secure option (with confirmation) to clear all browser data.

---

## 🚀 How To Use

https://romulo-godoi.github.io/relatorio/

---

## 💾 Data Storage

**Important:** All the data you log (hours, notes, plans, goals) is saved using your browser's **Local Storage**.

*   ✅ **Privacy:** The data remains only on your machine, in the browser you used.
*   ⚠️ **Attention:**
    *   If you **clear your browsing data** (cache, cookies, site data) from your browser, **all records will be LOST**.
    *   The data **is not synchronized** between different browsers or devices. If you use it on Chrome on your PC and then on Safari on your phone, there will be two separate data sets.
    *   In the future, we will have a version that synchronizes the data.

---

## 🛠️ Technologies Used

*   **HTML5:** Page structure.
*   **CSS3:** Styling (including CSS Variables, Flexbox, Grid for responsive layout).
*   **JavaScript (ES6+):** Application logic, DOM manipulation, data management.
*   **Chart.js (v4):** Library for creating interactive charts.
*   **Chart.js Annotation Plugin:** Plugin for adding average lines to the chart.
*   **Local Storage:** Browser API for persistent client-side data storage.

---

## 🤝 Contributing

Contributions are welcome! If you find any bugs, have suggestions for improvements, or want to add new features:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/NewFeature` or `bugfix/FixSomething`).
3.  Make your changes and commit (`git commit -m 'Adds NewFeature'`).
4.  Push to the branch (`git push origin feature/NewFeature`).
5.  Open a pull request.

---

## 📄 License

Distributed under the Apache License 2.0. See the link for more information: [https://www.apache.org/licenses/LICENSE-2.0)

---

We hope this tool is useful in your service! 😊
