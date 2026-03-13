import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    status: number;
    message: string;
    data: T;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        const response = context.switchToHttp().getResponse();
        const status = response.statusCode;

        return next.handle().pipe(
            map((data) => {
                // If it's already in the correct format, don't double wrap
                if (data && typeof data === 'object' && 'success' in data && 'status' in data && 'data' in data) {
                    return data;
                }

                return {
                    success: true,
                    status,
                    message: 'Success',
                    data: data || null,
                };
            }),
        );

    }
}
