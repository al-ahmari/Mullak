const form = document.getElementById('interest-form');
const successBox = document.getElementById('success-box');
const prefillButton = document.getElementById('prefill-button');

function showMessage(message, isSuccess) {
  successBox.textContent = message;
  successBox.classList.add('is-visible');
  successBox.style.background = isSuccess ? 'rgba(22, 101, 52, 0.1)' : 'rgba(194, 65, 12, 0.12)';
  successBox.style.color = isSuccess ? '#166534' : '#c2410c';
}

prefillButton.addEventListener('click', () => {
  document.getElementById('name').value = 'عبدالله';
  document.getElementById('phone').value = '0501234567';
  document.getElementById('units').value = '6 - 10 وحدات';
  document.getElementById('city').value = 'الرياض';
  document.getElementById('notes').value = 'أحتاج مكانًا واحدًا لمتابعة العقود وطلبات الصيانة.';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  successBox.classList.remove('is-visible');

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ الإرسال...';

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      showMessage(result.message || 'تعذر إرسال البيانات. حاول مرة أخرى.', false);
      return;
    }

    showMessage(result.message || 'تم إرسال بياناتك بنجاح.', true);
    form.reset();
  } catch {
    showMessage('تعذر الاتصال بالخادم. تأكد أن التطبيق يعمل ثم حاول مرة أخرى.', false);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'سجّل اهتمامي';
  }
});
