import React, { useState } from 'react';

import { tokens } from '@fluentui/react-components';

import { AddCarCard, CarCard, DeleteCarDialog } from '@/components/cars';
import { Stack } from '@/components/ui';
import { type Car, useCars } from '@/contexts';

export const CarsSection: React.FC = () => {
  const { cars, selectedCarId, setSelectedCarId, deleteCar } = useCars();

  const [carToDelete, setCarToDelete] = useState<Car | null>(null);

  const handleSelectCar = (car: Car) => {
    setSelectedCarId(car.id);
  };

  return (
    <Stack gap={tokens.spacingHorizontalM}>
      {cars.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          isSelected={selectedCarId === car.id}
          onSelect={() => handleSelectCar(car)}
          onDelete={() => setCarToDelete(car)}
        />
      ))}

      {/* Add car card - always visible at end */}
      <AddCarCard />

      {/* Delete confirmation dialog */}
      <DeleteCarDialog
        car={carToDelete}
        open={carToDelete !== null}
        onClose={() => setCarToDelete(null)}
        onConfirm={() => {
          if (carToDelete) {
            deleteCar(carToDelete.id);
            setCarToDelete(null);
          }
        }}
      />
    </Stack>
  );
};
