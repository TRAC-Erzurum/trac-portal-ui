<template>
  <v-container class="my-8">
    <h1 class="text-2xl font-bold mb-6">{{ $t('privacy.title') }}</h1>
    <div class="prose max-w-none">
      <p>Değerli Ziyaretçimiz,</p>
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve Genel Veri Koruma Yönetmeliği
        ("GDPR") uyarınca, kişisel verileriniz; veri sorumlusu olarak TRAC Erzurum Şube Başkanlığı
        tarafından aşağıda açıklanan kapsamda işlenebilecektir.
      </p>
      <h2>1. Kişisel Verilerin İşlenme Amacı</h2>
      <p>Kişisel verileriniz;</p>
      <ul>
        <li>Hizmetlerimizden faydalanabilmeniz için gerekli çalışmaların yürütülmesi</li>
        <li>İhtiyaç halinde sizinle iletişim kurulması</li>
        <li>Hizmet kalitemizin iyileştirilmesi</li>
        <li>Yasal yükümlülüklerimizin yerine getirilmesi</li>
      </ul>
      <p>amaçlarıyla işlenmektedir.</p>
      <h2>2. Kişisel Verilerin Aktarılması</h2>
      <p>
        Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi ile sınırlı olarak,
        kanunen yetkili kamu kurumlarına ve yetkili özel kişilere KVKK'nın 8. ve 9. maddelerinde
        belirtilen kişisel veri işleme şartları ve amaçları çerçevesinde aktarılabilecektir.
      </p>
      <h2>3. Kişisel Verilerin Silinmesi</h2>
      <p>
        Kişisel verilerinizin silinmesi talebinizi TRAC Erzurum Şube Başkanlığına iletebilirsiniz.
      </p>
      <br />
      <br />
      <p>Türkiye Radyo Amatörleri Cemiyeti</p>
      <p>Erzurum Şube Başkanlığı</p>
    </div>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
})
</script>
