import { useEffect, useState } from 'react'

const ListingsHeader = () => {

  const [cityData, setCityData] = useState({
    city: '',
    found: false
  })

  useEffect(() => {
    const foundData = JSON.parse(sessionStorage.getItem('cityFound'))
    const foundCity = sessionStorage.getItem('cityName');
    if (foundData && foundCity) {
      setCityData({
        city: foundCity,
        found: true
      })
    }
  }, [])
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h2 className="text-3xl font-bold text-center text-gray-900 ">
          {cityData?.found ? `Popular Offer  in ${cityData.city}` : `Popular Offer `}
        
        </h2>
        <p className="text-gray-600 mt-1">Discover  amazing businesses</p>
      </div>

    </div>

  )
}

export default ListingsHeader
