import { IsString, Length, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalyzeDto {
  @IsString()
  @IsNotEmpty({ message: 'Review text is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 500, { message: 'Review text must be between 1 and 500 characters' })
  text: string;
}
