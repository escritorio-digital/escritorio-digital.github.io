import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft } from 'lucide-react';
import './UnitConverter.css';

type UnitMap = { [unit: string]: (value: number) => number };

const CONVERSIONS = {
  length: {
    baseUnit: 'meters',
    units: {
      'meters': (v: number) => v,
      'kilometers': (v: number) => v / 1000,
      'miles': (v: number) => v / 1609.34,
      'feet': (v: number) => v * 3.28084,
    } as UnitMap,
  },
  weight: {
    baseUnit: 'kilograms',
    units: {
      'kilograms': (v: number) => v,
      'grams': (v: number) => v * 1000,
      'pounds': (v: number) => v * 2.20462,
      'ounces': (v: number) => v * 35.274,
    } as UnitMap,
  },
  temperature: {
    baseUnit: 'celsius',
    units: {
      'celsius': (v: number) => v,
      'fahrenheit': (v: number) => (v * 9/5) + 32,
      'kelvin': (v: number) => v + 273.15,
    } as UnitMap,
  }
};

type Category = keyof typeof CONVERSIONS;

export const UnitConverterWidget: FC = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category>('length');
  const [fromUnit, setFromUnit] = useState<string>('meters');
  const [toUnit, setToUnit] = useState<string>('feet');
  const [fromValue, setFromValue] = useState<string | number>(1);
  const [toValue, setToValue] = useState<string | number>('');
  const [isTyping, setIsTyping] = useState<'from' | 'to'>('from');

  const availableUnits = Object.keys(CONVERSIONS[category].units);

  useEffect(() => {
    const fromVal = parseFloat(String(fromValue));
    const toVal = parseFloat(String(toValue));
    const categoryData = CONVERSIONS[category];
    const units = categoryData.units;

    if (isTyping === 'from') {
      if (isNaN(fromVal)) {
        setToValue('');
        return;
      }
      let baseValue: number;
      if (category === 'temperature') {
        if (fromUnit === 'fahrenheit') baseValue = (fromVal - 32) * 5/9;
        else if (fromUnit === 'kelvin') baseValue = fromVal - 273.15;
        else baseValue = fromVal;
      } else {
        const toBaseConverter = Object.entries(units).find(([key, _]) => key === fromUnit)![1];
        baseValue = fromVal / toBaseConverter(1);
      }
      const finalValue = units[toUnit](baseValue);
      setToValue(parseFloat(finalValue.toFixed(4)));

    } else if (isTyping === 'to') {
        if (isNaN(toVal)) {
            setFromValue('');
            return;
        }
        let baseValue: number;
        if (category === 'temperature') {
            if (toUnit === 'fahrenheit') baseValue = (toVal - 32) * 5/9;
            else if (toUnit === 'kelvin') baseValue = toVal - 273.15;
            else baseValue = toVal;
        } else {
            const toBaseConverter = Object.entries(units).find(([key, _]) => key === toUnit)![1];
            baseValue = toVal / toBaseConverter(1);
        }
        const finalValue = units[fromUnit](baseValue);
        setFromValue(parseFloat(finalValue.toFixed(4)));
    }
  }, [fromValue, toValue, fromUnit, toUnit, category, isTyping]);
  
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromValue(e.target.value);
    setIsTyping('from');
  };
  
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToValue(e.target.value);
    setIsTyping('to');
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as Category;
    setCategory(newCategory);
    const newUnits = Object.keys(CONVERSIONS[newCategory].units);
    setFromUnit(newUnits[0]);
    setToUnit(newUnits[1] || newUnits[0]);
    setFromValue(1);
    setIsTyping('from');
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setIsTyping('from');
  };

  return (
    <div className="unit-converter-widget">
      <div className="category-selector">
        <label htmlFor="category">{t('widgets.unit_converter.category_label')}</label>
        <select id="category" value={category} onChange={handleCategoryChange}>
          {Object.keys(CONVERSIONS).map(cat => <option key={cat} value={cat}>{t(`widgets.unit_converter.categories.${cat}`)}</option>)}
        </select>
      </div>

      <div className="conversion-interface">
        <div className="unit-group">
          <input type="number" value={fromValue} onChange={handleFromChange} />
          <select value={fromUnit} onChange={e => { setFromUnit(e.target.value); setIsTyping('from'); }}>
            {availableUnits.map(unit => <option key={unit} value={unit}>{t(`widgets.unit_converter.units.${unit}`)}</option>)}
          </select>
        </div>

        <button onClick={swapUnits} className="swap-button" title={t('widgets.unit_converter.swap_button_title')}>
          <ArrowRightLeft size={20} />
        </button>

        <div className="unit-group">
          <input type="number" value={toValue} onChange={handleToChange} />
          <select value={toUnit} onChange={e => { setToUnit(e.target.value); setIsTyping('to'); }}>
            {availableUnits.map(unit => <option key={unit} value={unit}>{t(`widgets.unit_converter.units.${unit}`)}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
