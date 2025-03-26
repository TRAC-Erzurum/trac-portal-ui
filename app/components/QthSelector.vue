<template>
  <div>
    <div class="text-subtitle-2 text-medium-emphasis mb-3" v-if="!noLabel">
      {{ t('qth.title') }}
    </div>
    <v-row>
      <v-col cols="12" sm="4">
        <v-autocomplete
          v-model="countryModel"
          :items="countries"
          :label="t('qth.country')"
          variant="outlined"
          hide-details
          :filter="customFilter"
          @blur="handleCountryBlur"
          hide-no-data
          prepend-inner-icon="mdi-earth"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-autocomplete
          v-model="cityModel"
          :items="cities"
          :label="t('qth.city')"
          variant="outlined"
          hide-details
          :filter="customFilter"
          @blur="handleCityBlur"
          hide-no-data
          :disabled="!countryModel || loadingCities"
          prepend-inner-icon="mdi-city"
          :loading="loadingCities"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-autocomplete
          v-model="districtModel"
          :items="districts"
          :label="t('qth.district')"
          variant="outlined"
          hide-details
          :filter="customFilter"
          @blur="handleDistrictBlur"
          hide-no-data
          :disabled="!cityModel || loadingDistricts"
          prepend-inner-icon="mdi-map-marker-radius"
          :loading="loadingDistricts"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
const { t } = useI18n()
const api = useApi()
const { compareGlobal, normalizeString } = useStringUtils()

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      country: '',
      city: '',
      district: '',
    }),
  },
  noLabel: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const initialized = ref(false)
const loadingCities = ref(false)
const loadingDistricts = ref(false)

const countries = ref([])
const cities = ref([])
const districts = ref([])

const updateModel = (updates) => {
  const newValue = { ...props.modelValue, ...updates }
  emit('update:modelValue', newValue)
}

const countryModel = computed({
  get: () => props.modelValue.country || '',
  set: (value) => {
    if (value !== props.modelValue.country) {
      updateModel({ country: value, city: '', district: '' })
      loadCities(value)
    }
  },
})

const cityModel = computed({
  get: () => props.modelValue.city || '',
  set: (value) => {
    if (value !== props.modelValue.city) {
      updateModel({ city: value, district: '' })
      loadDistricts(countryModel.value, value)
    }
  },
})

const districtModel = computed({
  get: () => props.modelValue.district || '',
  set: (value) => {
    if (value !== props.modelValue.district) {
      updateModel({ district: value })
    }
  },
})

const customFilter = (item, queryText) => {
  if (!queryText) return true
  return normalizeString(item).includes(normalizeString(queryText))
}

const handleCountryBlur = (event) => {
  if (event.target.value && event.target.value !== countryModel.value) {
    countryModel.value = event.target.value
  }
}

const handleCityBlur = (event) => {
  if (event.target.value && event.target.value !== cityModel.value) {
    cityModel.value = event.target.value
  }
}

const handleDistrictBlur = (event) => {
  if (event.target.value && event.target.value !== districtModel.value) {
    districtModel.value = event.target.value
  }
}

const loadCities = async (country) => {
  if (!country) {
    cities.value = []
    districts.value = []
    return
  }

  loadingCities.value = true
  try {
    const citiesResponse = await api.get(`/qth/countries/${country}/cities`)
    cities.value = citiesResponse.map((city) => city.name)

    if (props.modelValue.city && initialized.value) {
      loadDistricts(country, props.modelValue.city)
    }
  } catch (error) {
    console.error('Error fetching cities:', error)
    cities.value = []
  } finally {
    loadingCities.value = false
  }
}

const loadDistricts = async (country, city) => {
  if (!country || !city) {
    districts.value = []
    return
  }

  loadingDistricts.value = true
  try {
    const citiesResponse = await api.get(`/qth/countries/${country}/cities`)
    const cityData = citiesResponse.find((c) => compareGlobal(c.name, city))
    districts.value = cityData?.districts?.map((district) => district.name) || []
  } catch (error) {
    console.error('Error fetching districts:', error)
    districts.value = []
  } finally {
    loadingDistricts.value = false
  }
}

watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    if (initialized.value) {
      if (newValue.country !== oldValue.country) {
        loadCities(newValue.country)
      }

      if (newValue.city !== oldValue.city && newValue.country) {
        loadDistricts(newValue.country, newValue.city)
      }
    }
  },
  { deep: true }
)

onMounted(async () => {
  try {
    const countriesResponse = await api.get('/qth/countries')
    countries.value = countriesResponse.map((country) => country.name)

    if (props.modelValue.country) {
      await loadCities(props.modelValue.country)

      if (props.modelValue.city) {
        await loadDistricts(props.modelValue.country, props.modelValue.city)
      }
    }

    initialized.value = true
  } catch (error) {
    console.error('Error fetching countries:', error)
    countries.value = []
  }
})
</script>
